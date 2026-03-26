import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  createConversation,
  createMessage,
  getConversation,
  getConversations,
  getMessages,
  getUnreadCount,
  readMessage
} from "./conversations.controller.js";
import {
  conversationIdParamsSchema,
  conversationMessagesQuerySchema,
  createConversationSchema,
  createMessageSchema,
  readMessageSchema
} from "./conversations.validation.js";

export const conversationRouter = Router();

conversationRouter.use(asyncHandler(requireAuth));
conversationRouter.get("/unread-count", asyncHandler(getUnreadCount));
conversationRouter.get("/", asyncHandler(getConversations));
conversationRouter.post("/", validate(createConversationSchema), asyncHandler(createConversation));
conversationRouter.get("/:conversationId", validate(conversationIdParamsSchema), asyncHandler(getConversation));
conversationRouter.get("/:conversationId/messages", validate(conversationMessagesQuerySchema), asyncHandler(getMessages));
conversationRouter.post("/:conversationId/messages", validate(createMessageSchema), asyncHandler(createMessage));
conversationRouter.patch(
  "/:conversationId/messages/:messageId/read",
  validate(readMessageSchema),
  asyncHandler(readMessage)
);
