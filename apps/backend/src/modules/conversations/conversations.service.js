import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Notification } from "../notifications/notification.model.js";
import { User } from "../users/user.model.js";
import { Conversation } from "./conversation.model.js";
import { Message } from "./message.model.js";

const formatConversation = (conversation) => ({
  id: conversation._id,
  type: conversation.type,
  participantIds: conversation.participantIds,
  propertyId: conversation.propertyId,
  lastMessageId: conversation.lastMessageId,
  lastMessageAt: conversation.lastMessageAt,
  lastMessagePreview: conversation.lastMessagePreview,
  createdBy: conversation.createdBy,
  isActive: conversation.isActive,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt
});

const formatMessage = (message) => ({
  id: message._id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  receiverId: message.receiverId,
  content: message.content,
  messageType: message.messageType,
  attachments: message.attachments,
  status: message.status,
  deliveredAt: message.deliveredAt,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
});

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

export const listUserConversations = async (userId) => {
  const conversations = await Conversation.find({
    participantIds: userId,
    isActive: true
  })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(100)
    .lean();

  return conversations.map(formatConversation);
};

export const getConversationById = async (conversationId, userId) => {
  const conversation = await ensureConversationParticipant(conversationId, userId);
  return formatConversation(conversation.toObject());
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
    propertyId,
    isActive: true
  });

  if (existingConversation) {
    return formatConversation(existingConversation.toObject());
  }

  const conversation = await Conversation.create({
    type: "private",
    participantIds: normalizedParticipants,
    propertyId,
    createdBy: userId
  });

  return formatConversation(conversation.toObject());
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

export const createConversationMessage = async ({ conversationId, senderId, content, messageType = "text", attachments = [] }) => {
  const conversation = await ensureConversationParticipant(conversationId, senderId);
  const receiverId = conversation.participantIds.find((participantId) => String(participantId) !== String(senderId));

  const message = await Message.create({
    conversationId,
    senderId,
    receiverId,
    content,
    messageType,
    attachments,
    status: "sent"
  });

  conversation.lastMessageId = message._id;
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = content.slice(0, 120);
  await conversation.save();

  await Notification.create({
    userId: receiverId,
    type: "new_message",
    title: "Nouveau message",
    body: content.slice(0, 120),
    data: {
      conversationId,
      messageId: message._id,
      senderId
    },
    channel: "in_app"
  });

  return {
    conversation: formatConversation(conversation.toObject()),
    message: formatMessage(message.toObject())
  };
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
