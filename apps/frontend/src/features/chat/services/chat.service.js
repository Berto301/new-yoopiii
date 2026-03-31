import { apiClient } from "../../../lib/api/client.js";

export const getConversations = async () => {
  const response = await apiClient.get("/conversations");
  return response.data.data;
};

export const createConversation = async (payload) => {
  const response = await apiClient.post("/conversations", payload);
  return response.data.data;
};

export const getConversationMessages = async ({ conversationId, page = 1, limit = 30 }) => {
  const response = await apiClient.get(`/conversations/${conversationId}/messages`, {
    params: { page, limit }
  });

  return response.data.data;
};

export const sendConversationMessage = async ({ conversationId, content, messageType = "text", attachments = [] }) => {
  const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
    content,
    messageType,
    attachments
  });

  return response.data.data;
};

export const markConversationMessageRead = async ({ conversationId, messageId }) => {
  const response = await apiClient.patch(`/conversations/${conversationId}/messages/${messageId}/read`);
  return response.data.data;
};

export const getUnreadConversationCount = async () => {
  const response = await apiClient.get("/conversations/unread-count");
  return response.data.data;
};
