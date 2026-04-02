import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  createConversation,
  createMessage,
  deleteConversationWithParticipant,
  deleteMessage,
  getConversation,
  getConversations,
  getMessages,
  getUnreadCount,
  readMessage,
  updateMessage
} from "./conversations.controller.js";
import {
  conversationIdParamsSchema,
  conversationMessagesQuerySchema,
  conversationParticipantParamsSchema,
  createConversationSchema,
  createMessageSchema,
  messageParamsSchema,
  updateMessageSchema
} from "./conversations.validation.js";

export const conversationRouter = Router();

conversationRouter.use(asyncHandler(requireAuth));
conversationRouter.get("/unread-count", asyncHandler(getUnreadCount));
conversationRouter.get("/", asyncHandler(getConversations));
conversationRouter.post("/", validate(createConversationSchema), asyncHandler(createConversation));
conversationRouter.delete("/with/:participantId", validate(conversationParticipantParamsSchema), asyncHandler(deleteConversationWithParticipant));
conversationRouter.get("/:conversationId", validate(conversationIdParamsSchema), asyncHandler(getConversation));
conversationRouter.get("/:conversationId/messages", validate(conversationMessagesQuerySchema), asyncHandler(getMessages));
conversationRouter.post("/:conversationId/messages", validate(createMessageSchema), asyncHandler(createMessage));
conversationRouter.patch("/:conversationId/messages/:messageId", validate(updateMessageSchema), asyncHandler(updateMessage));
conversationRouter.delete("/:conversationId/messages/:messageId", validate(messageParamsSchema), asyncHandler(deleteMessage));
conversationRouter.patch("/:conversationId/messages/:messageId/read", validate(messageParamsSchema), asyncHandler(readMessage));
