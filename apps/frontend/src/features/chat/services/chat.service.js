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

export const sendConversationMessage = async ({
  conversationId,
  content,
  messageType = "text",
  attachments = [],
  appointment = null,
  communicationReport = null,
  visitReport = null
}) => {
  const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
    content,
    messageType,
    attachments,
    appointment,
    communicationReport,
    visitReport
  });

  return response.data.data;
};

export const updateConversationMessage = async ({
  conversationId,
  messageId,
  content,
  messageType,
  appointment,
  communicationReport,
  visitReport
}) => {
  const response = await apiClient.patch(`/conversations/${conversationId}/messages/${messageId}`, {
    content,
    ...(messageType ? { messageType } : {}),
    ...(appointment !== undefined ? { appointment } : {}),
    ...(communicationReport !== undefined ? { communicationReport } : {}),
    ...(visitReport !== undefined ? { visitReport } : {})
  });
  return response.data.data?.message || response.data.data;
};

export const deleteConversationMessage = async ({ conversationId, messageId }) => {
  const response = await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}`);
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

export const deleteConversationsWithParticipant = async ({ participantId }) => {
  const response = await apiClient.delete(`/conversations/with/${participantId}`);
  return response.data.data;
};

export const uploadConversationAttachments = async (files) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await apiClient.post("/conversations/uploads/attachments", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data.data;
};
