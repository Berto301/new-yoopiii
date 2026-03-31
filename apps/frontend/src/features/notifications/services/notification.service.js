import { apiClient } from "../../../lib/api/client.js";

export const getNotifications = async (params = {}) => {
  const response = await apiClient.get("/notifications", { params });
  return response.data.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);
  return response.data.data;
};
