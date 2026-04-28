import { apiClient } from "../../../lib/api/client.js";

export const getNotifications = async (params = {}) => {
  const response = await apiClient.get("/notifications", { params });
  return response.data.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);
  return response.data.data;
};

export const getPushPublicKey = async () => {
  const response = await apiClient.get("/notifications/push/public-key");
  return response.data.data;
};

export const getPushSubscriptionStatus = async () => {
  const response = await apiClient.get("/notifications/push/subscription");
  return response.data.data;
};

export const createPushSubscription = async (payload) => {
  const response = await apiClient.post("/notifications/push/subscriptions", payload);
  return response.data.data;
};

export const deletePushSubscription = async (payload) => {
  const response = await apiClient.delete("/notifications/push/subscriptions", { data: payload });
  return response.data.data;
};
