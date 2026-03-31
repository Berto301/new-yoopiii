import { Notification } from "./notification.model.js";

export const createNotifications = async (payloads) => {
  const validPayloads = payloads.filter(Boolean);

  if (!validPayloads.length) {
    return [];
  }

  return Notification.insertMany(validPayloads, { ordered: false });
};

export const listUserNotifications = async ({ userId, limit = 50 }) =>
  Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

export const markNotificationRead = async ({ notificationId, userId }) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    },
    { new: true }
  ).lean();
