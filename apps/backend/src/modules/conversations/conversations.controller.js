import { StatusCodes } from "http-status-codes";
import {
  createConversationMessage,
  createOrGetPrivateConversation,
  getConversationById,
  getUnreadMessagesCount,
  listConversationMessages,
  listUserConversations,
  markMessageAsRead
} from "./conversations.service.js";

export const getConversations = async (req, res) => {
  const conversations = await listUserConversations(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: conversations
  });
};

export const createConversation = async (req, res) => {
  const conversation = await createOrGetPrivateConversation({
    userId: req.user.id,
    participantId: req.validated.body.participantId,
    propertyId: req.validated.body.propertyId || null
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: conversation
  });
};

export const getConversation = async (req, res) => {
  const conversation = await getConversationById(req.validated.params.conversationId, req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: conversation
  });
};

export const getMessages = async (req, res) => {
  const result = await listConversationMessages({
    conversationId: req.validated.params.conversationId,
    userId: req.user.id,
    page: req.validated.query.page,
    limit: req.validated.query.limit
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const createMessage = async (req, res) => {
  const result = await createConversationMessage({
    conversationId: req.validated.params.conversationId,
    senderId: req.user.id,
    content: req.validated.body.content,
    messageType: req.validated.body.messageType,
    attachments: req.validated.body.attachments
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: result
  });
};

export const readMessage = async (req, res) => {
  const message = await markMessageAsRead({
    conversationId: req.validated.params.conversationId,
    messageId: req.validated.params.messageId,
    userId: req.user.id
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: message
  });
};

export const getUnreadCount = async (req, res) => {
  const result = await getUnreadMessagesCount(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};
