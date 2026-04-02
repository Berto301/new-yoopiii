import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Notification } from "../notifications/notification.model.js";
import { Property } from "../properties/property.model.js";
import { User } from "../users/user.model.js";
import { Conversation } from "./conversation.model.js";
import { Message } from "./message.model.js";

const formatConversation = (conversation) => {
  const participantProfiles = (conversation.participantIds || []).map((participant) => {
    if (participant && typeof participant === "object" && participant._id) {
      return {
        id: String(participant._id),
        firstName: participant.firstName || "",
        lastName: participant.lastName || "",
        email: participant.email || "",
        role: participant.role || ""
      };
    }

      return {
        id: String(participant),
        firstName: "",
        lastName: "",
        email: "",
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
  status: message.status,
  deliveredAt: message.deliveredAt,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
});

const buildNotificationPayload = ({ conversationId, message, actorId, recipientId, isUpdate = false }) => ({
  userId: recipientId,
  type: message.messageType === "appointment"
    ? message.appointment?.status === "closed_won"
      ? "appointment_closed_won"
      : (isUpdate ? "appointment_updated" : "appointment_created")
    : "new_message",
  title: message.messageType === "appointment"
    ? message.appointment?.status === "closed_won"
      ? "Rendez-vous conclu"
      : (isUpdate ? "Rendez-vous mis a jour" : "Nouveau rendez-vous")
    : (isUpdate ? "Message modifie" : "Nouveau message"),
  body: message.content.slice(0, 120),
  data: {
    conversationId,
    messageId: message._id,
    senderId: actorId,
    appointmentId: message.appointment?.appointmentId || null,
    propertyId: message.appointment?.propertyId || null,
    propertyTitle: message.appointment?.propertyTitle || null,
    appointmentStatus: message.appointment?.status || null
  },
  channel: "in_app"
});

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
    .populate("participantIds", "firstName lastName email role")
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
    .populate("participantIds", "firstName lastName email role")
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
  }).populate("participantIds", "firstName lastName email role");

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
    .populate("participantIds", "firstName lastName email role")
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
  appointment = null
}) => {
  const conversation = await ensureConversationParticipant(conversationId, senderId);
  const receiverId = conversation.participantIds.find((participantId) => String(participantId) !== String(senderId));

  const message = await Message.create({
    conversationId,
    senderId,
    receiverId,
    content,
    messageType,
    attachments,
    appointment,
    status: "sent"
  });

  conversation.lastMessageId = message._id;
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = content.slice(0, 120);
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
  appointment
}) => {
  const { conversation, message } = await ensureMessageUpdatable({ conversationId, messageId, userId });
  const recipientId = conversation.participantIds.find((participantId) => String(participantId) !== String(userId));

  message.content = content;

  if (messageType) {
    message.messageType = messageType;
  }

  if (appointment !== undefined) {
    message.appointment = appointment;
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
