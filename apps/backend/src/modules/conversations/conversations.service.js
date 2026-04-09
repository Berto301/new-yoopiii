import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Notification } from "../notifications/notification.model.js";
import { Property } from "../properties/property.model.js";
import { User } from "../users/user.model.js";
import { Conversation } from "./conversation.model.js";
import { Message } from "./message.model.js";
import {
  buildConversationNotificationData,
  buildNotificationDescriptor,
  resolveMessageContent
} from "./conversations.report-utils.js";

const formatConversation = (conversation) => {
  const participantProfiles = (conversation.participantIds || []).map((participant) => {
    if (participant && typeof participant === "object" && participant._id) {
      return {
        id: String(participant._id),
        firstName: participant.firstName || "",
        lastName: participant.lastName || "",
        email: participant.email || "",
        avatar: participant.avatar || null,
        role: participant.role || ""
      };
    }

    return {
      id: String(participant),
      firstName: "",
      lastName: "",
      email: "",
      avatar: null,
      role: ""
    };
  });

  return {
    id: conversation._id,
    type: conversation.type,
    participantIds: participantProfiles.map((participant) => participant.id),
    participantProfiles,
    propertyId: conversation.propertyId,
    lastMessageId: conversation.lastMessageId,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    createdBy: conversation.createdBy,
    isActive: conversation.isActive,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  };
};

const formatMessage = (message) => ({
  id: message._id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  receiverId: message.receiverId,
  content: message.content,
  messageType: message.messageType,
  attachments: message.attachments,
  appointment: message.appointment || null,
  communicationReport: message.communicationReport || null,
  visitReport: message.visitReport || null,
  status: message.status,
  deliveredAt: message.deliveredAt,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
});

const buildNotificationPayload = ({ conversationId, message, actorId, recipientId, isUpdate = false }) => {
  const descriptor = buildNotificationDescriptor({
    messageType: message.messageType,
    appointment: message.appointment,
    communicationReport: message.communicationReport,
    visitReport: message.visitReport,
    isUpdate
  });

  return {
    userId: recipientId,
    type: descriptor.type,
    title: descriptor.title,
    body: message.content.slice(0, 120),
    data: buildConversationNotificationData({ conversationId, message, actorId }),
    channel: "in_app"
  };
};

const syncAppointmentPropertyOutcome = async (appointment) => {
  if (!appointment?.propertyId || appointment.status !== "closed_won") {
    return null;
  }

  const property = await Property.findById(appointment.propertyId);

  if (!property) {
    return null;
  }

  property.status = appointment.propertyPurpose === "rent" ? "rented" : "sold";
  property.reservedByUserId = null;
  property.reservedAt = null;
  await property.save();

  return property;
};

const refreshConversationLastMessage = async (conversationId) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return null;
  }

  const latestMessage = await Message.findOne({ conversationId, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  if (!latestMessage) {
    conversation.lastMessageId = null;
    conversation.lastMessageAt = null;
    conversation.lastMessagePreview = "";
    await conversation.save();
    return conversation;
  }

  conversation.lastMessageId = latestMessage._id;
  conversation.lastMessageAt = latestMessage.createdAt;
  conversation.lastMessagePreview = latestMessage.content.slice(0, 120);
  await conversation.save();
  return conversation;
};

export const ensureConversationParticipant = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participantIds: userId,
    isActive: true
  });

  if (!conversation) {
    throw new AppError("Conversation not found or forbidden", StatusCodes.FORBIDDEN);
  }

  return conversation;
};

const ensureMessageUpdatable = async ({ conversationId, messageId, userId }) => {
  const conversation = await ensureConversationParticipant(conversationId, userId);

  const message = await Message.findOne({
    _id: messageId,
    conversationId,
    isDeleted: false
  });

  if (!message) {
    throw new AppError("Message not found", StatusCodes.NOT_FOUND);
  }

  const isSender = String(message.senderId) === String(userId);

  if (!isSender && message.messageType !== "appointment") {
    throw new AppError("Message not found or forbidden", StatusCodes.FORBIDDEN);
  }

  return { conversation, message };
};

const ensureMessageDeletable = async ({ conversationId, messageId, userId }) => {
  await ensureConversationParticipant(conversationId, userId);

  const message = await Message.findOne({
    _id: messageId,
    conversationId,
    senderId: userId,
    isDeleted: false
  });

  if (!message) {
    throw new AppError("Message not found or forbidden", StatusCodes.FORBIDDEN);
  }

  return message;
};

export const listUserConversations = async (userId) => {
  const conversations = await Conversation.find({
    participantIds: userId,
    isActive: true
  })
    .populate("participantIds", "firstName lastName email avatar role")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(100)
    .lean();

  return conversations.map(formatConversation);
};

export const getConversationById = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participantIds: userId,
    isActive: true
  })
    .populate("participantIds", "firstName lastName email avatar role")
    .lean();

  if (!conversation) {
    throw new AppError("Conversation not found or forbidden", StatusCodes.FORBIDDEN);
  }

  return formatConversation(conversation);
};

export const createOrGetPrivateConversation = async ({ userId, participantId, propertyId = null }) => {
  if (userId === participantId) {
    throw new AppError("You cannot create a conversation with yourself", StatusCodes.BAD_REQUEST);
  }

  const participant = await User.findById(participantId).select("_id status").lean();

  if (!participant || participant.status !== "active") {
    throw new AppError("Target participant not found", StatusCodes.NOT_FOUND);
  }

  const normalizedParticipants = [userId, participantId].sort();
  const existingConversation = await Conversation.findOne({
    type: "private",
    participantIds: { $all: normalizedParticipants, $size: 2 },
    isActive: true
  }).populate("participantIds", "firstName lastName email avatar role");

  if (existingConversation) {
    if (!existingConversation.propertyId && propertyId) {
      existingConversation.propertyId = propertyId;
      await existingConversation.save();
    }

    return formatConversation(existingConversation.toObject());
  }

  const conversation = await Conversation.create({
    type: "private",
    participantIds: normalizedParticipants,
    propertyId,
    createdBy: userId
  });

  const populatedConversation = await Conversation.findById(conversation._id)
    .populate("participantIds", "firstName lastName email avatar role")
    .lean();

  return formatConversation(populatedConversation);
};

export const listConversationMessages = async ({ conversationId, userId, page = 1, limit = 30 }) => {
  await ensureConversationParticipant(conversationId, userId);

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    Message.find({ conversationId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ conversationId, isDeleted: false })
  ]);

  return {
    items: messages.reverse().map(formatMessage),
    pagination: {
      page,
      limit,
      total,
      hasNextPage: skip + messages.length < total
    }
  };
};

export const createConversationMessage = async ({
  conversationId,
  senderId,
  content,
  messageType = "text",
  attachments = [],
  appointment = null,
  communicationReport = null,
  visitReport = null
}) => {
  const conversation = await ensureConversationParticipant(conversationId, senderId);
  const receiverId = conversation.participantIds.find((participantId) => String(participantId) !== String(senderId));
  const resolvedContent = resolveMessageContent({
    content,
    messageType,
    communicationReport,
    visitReport
  });

  const message = await Message.create({
    conversationId,
    senderId,
    receiverId,
    content: resolvedContent,
    messageType,
    attachments,
    appointment,
    communicationReport,
    visitReport,
    status: "sent"
  });

  conversation.lastMessageId = message._id;
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = resolvedContent.slice(0, 120);
  await conversation.save();

  await Notification.create(buildNotificationPayload({
    conversationId,
    message,
    actorId: senderId,
    recipientId: receiverId,
    isUpdate: false
  }));

  await syncAppointmentPropertyOutcome(message.appointment);

  return {
    conversation: formatConversation(conversation.toObject()),
    message: formatMessage(message.toObject()),
    recipientId: String(receiverId)
  };
};

export const updateConversationMessage = async ({
  conversationId,
  messageId,
  userId,
  content,
  messageType,
  attachments,
  appointment,
  communicationReport,
  visitReport
}) => {
  const { conversation, message } = await ensureMessageUpdatable({ conversationId, messageId, userId });
  const recipientId = conversation.participantIds.find((participantId) => String(participantId) !== String(userId));
  const nextMessageType = messageType || message.messageType;
  const nextCommunicationReport = communicationReport !== undefined ? communicationReport : message.communicationReport;
  const nextVisitReport = visitReport !== undefined ? visitReport : message.visitReport;

  message.content = resolveMessageContent({
    content,
    messageType: nextMessageType,
    communicationReport: nextCommunicationReport,
    visitReport: nextVisitReport
  });

  if (messageType) {
    message.messageType = messageType;
  }

  if (attachments !== undefined) {
    message.attachments = attachments;
  }

  if (appointment !== undefined) {
    message.appointment = appointment;
  }

  if (communicationReport !== undefined) {
    message.communicationReport = communicationReport;
  }

  if (visitReport !== undefined) {
    message.visitReport = visitReport;
  }

  await message.save();

  const refreshedConversation = await refreshConversationLastMessage(conversationId);

  await Notification.create(buildNotificationPayload({
    conversationId,
    message,
    actorId: userId,
    recipientId,
    isUpdate: true
  }));

  await syncAppointmentPropertyOutcome(message.appointment);

  return {
    conversation: refreshedConversation ? formatConversation(refreshedConversation.toObject()) : null,
    message: formatMessage(message.toObject()),
    recipientId: String(recipientId)
  };
};

export const deleteConversationMessage = async ({ conversationId, messageId, userId }) => {
  const message = await ensureMessageDeletable({ conversationId, messageId, userId });
  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  await refreshConversationLastMessage(conversationId);

  return { id: String(message._id), deleted: true };
};

export const markMessageAsDelivered = async ({ conversationId, messageId, receiverId }) => {
  const message = await Message.findOneAndUpdate(
    {
      _id: messageId,
      conversationId,
      receiverId,
      deliveredAt: null
    },
    {
      $set: {
        deliveredAt: new Date(),
        status: "delivered"
      }
    },
    { new: true }
  ).lean();

  return message ? formatMessage(message) : null;
};

export const markMessageAsRead = async ({ conversationId, messageId, userId }) => {
  await ensureConversationParticipant(conversationId, userId);

  const message = await Message.findOneAndUpdate(
    {
      _id: messageId,
      conversationId,
      receiverId: userId,
      readAt: null
    },
    {
      $set: {
        readAt: new Date(),
        deliveredAt: new Date(),
        status: "read"
      }
    },
    { new: true }
  ).lean();

  if (!message) {
    throw new AppError("Message not found or already read", StatusCodes.NOT_FOUND);
  }

  return formatMessage(message);
};

export const getUnreadMessagesCount = async (userId) => {
  const total = await Message.countDocuments({
    receiverId: new mongoose.Types.ObjectId(userId),
    readAt: null,
    isDeleted: false
  });

  return { total };
};

export const deletePrivateConversationsBetweenUsers = async ({ userId, participantId }) => {
  if (userId === participantId) {
    throw new AppError("You cannot delete a conversation with yourself", StatusCodes.BAD_REQUEST);
  }

  const normalizedParticipants = [userId, participantId].sort();
  const conversations = await Conversation.find({
    type: "private",
    participantIds: { $all: normalizedParticipants, $size: 2 }
  })
    .select("_id")
    .lean();

  const conversationIds = conversations.map((conversation) => conversation._id);

  if (!conversationIds.length) {
    return {
      deletedConversationsCount: 0,
      deletedMessagesCount: 0
    };
  }

  const [deletedMessagesResult, deletedConversationsResult] = await Promise.all([
    Message.deleteMany({ conversationId: { $in: conversationIds } }),
    Conversation.deleteMany({ _id: { $in: conversationIds } })
  ]);

  return {
    deletedConversationsCount: deletedConversationsResult.deletedCount || 0,
    deletedMessagesCount: deletedMessagesResult.deletedCount || 0
  };
};
