import { AppError } from "../../../core/errors/app-error.js";
import {
  createConversationMessage,
  ensureConversationParticipant,
  markMessageAsDelivered,
  markMessageAsRead
} from "../../../modules/conversations/conversations.service.js";
import { conversationRoomName, userRoomName } from "../rooms/room-names.js";

export const registerChatHandlers = (io, socket) => {
  socket.on("conversation:join", async ({ conversationId }, callback = () => {}) => {
    try {
      await ensureConversationParticipant(conversationId, socket.data.user.id);
      socket.join(conversationRoomName(conversationId));
      callback({ ok: true, conversationId });
    } catch (error) {
      callback({ ok: false, message: error.message });
      socket.emit("socket:error", { code: "FORBIDDEN", message: error.message });
    }
  });

  socket.on("conversation:leave", ({ conversationId }, callback = () => {}) => {
    socket.leave(conversationRoomName(conversationId));
    callback({ ok: true, conversationId });
  });

  socket.on("message:send", async (payload, callback = () => {}) => {
    try {
      const result = await createConversationMessage({
        conversationId: payload.conversationId,
        senderId: socket.data.user.id,
        content: payload.content,
        messageType: payload.messageType,
        attachments: payload.attachments || []
      });

      io.to(conversationRoomName(payload.conversationId)).emit("message:new", {
        conversationId: payload.conversationId,
        message: result.message
      });

      io.to(userRoomName(String(result.message.receiverId))).emit("notification:new", {
        type: "new_message",
        title: "Nouveau message",
        body: result.message.content.slice(0, 120),
        data: {
          conversationId: payload.conversationId,
          messageId: result.message.id,
          senderId: result.message.senderId
        }
      });

      const recipientRoom = io.sockets.adapter.rooms.get(userRoomName(String(result.message.receiverId)));

      if (recipientRoom && recipientRoom.size > 0) {
        const deliveredMessage = await markMessageAsDelivered({
          conversationId: payload.conversationId,
          messageId: result.message.id,
          receiverId: String(result.message.receiverId)
        });

        if (deliveredMessage) {
          io.to(conversationRoomName(payload.conversationId)).emit("message:delivered", {
            conversationId: payload.conversationId,
            messageId: deliveredMessage.id,
            deliveredAt: deliveredMessage.deliveredAt
          });
        }
      }

      io.to(conversationRoomName(payload.conversationId)).emit("conversation:updated", {
        conversation: result.conversation
      });

      callback({ ok: true, data: result });
    } catch (error) {
      callback({ ok: false, message: error.message });
      socket.emit("socket:error", { code: "MESSAGE_SEND_FAILED", message: error.message });
    }
  });

  socket.on("message:read", async ({ conversationId, messageId }, callback = () => {}) => {
    try {
      const message = await markMessageAsRead({
        conversationId,
        messageId,
        userId: socket.data.user.id
      });

      io.to(conversationRoomName(conversationId)).emit("message:read", {
        conversationId,
        messageId: message.id,
        readAt: message.readAt,
        readByUserId: socket.data.user.id
      });

      callback({ ok: true, data: message });
    } catch (error) {
      callback({ ok: false, message: error.message });
      socket.emit("socket:error", { code: "MESSAGE_READ_FAILED", message: error.message });
    }
  });

  socket.on("conversation:typing:start", async ({ conversationId }) => {
    try {
      await ensureConversationParticipant(conversationId, socket.data.user.id);
      socket.to(conversationRoomName(conversationId)).emit("conversation:typing", {
        conversationId,
        userId: socket.data.user.id,
        isTyping: true
      });
    } catch (_error) {}
  });

  socket.on("conversation:typing:stop", async ({ conversationId }) => {
    try {
      await ensureConversationParticipant(conversationId, socket.data.user.id);
      socket.to(conversationRoomName(conversationId)).emit("conversation:typing", {
        conversationId,
        userId: socket.data.user.id,
        isTyping: false
      });
    } catch (_error) {}
  });

  socket.on("notification:subscribe", ({ userId }, callback = () => {}) => {
    if (userId !== socket.data.user.id) {
      const error = new AppError("Forbidden notification subscription", 403);
      callback({ ok: false, message: error.message });
      socket.emit("socket:error", { code: "FORBIDDEN", message: error.message });
      return;
    }

    socket.join(userRoomName(userId));
    callback({ ok: true });
  });
};
