import { Notification } from "./notification.model.js";
import { User } from "../users/user.model.js";

export const createNotifications = async (payloads) => {
  const validPayloads = payloads.filter(Boolean);

  if (!validPayloads.length) {
    return [];
  }

  return Notification.insertMany(validPayloads, { ordered: false });
};

const resolveContactTargetId = (notification) =>
  notification?.data?.senderId ||
  notification?.data?.actorId ||
  notification?.data?.reservedByUserId ||
  null;

const buildContactTargetMap = async (notifications, currentUserId) => {
  const targetIds = [
    ...new Set(
      notifications
        .map(resolveContactTargetId)
        .filter(Boolean)
        .map(String)
        .filter((targetId) => targetId !== String(currentUserId))
    )
  ];

  if (!targetIds.length) {
    return new Map();
  }

  const users = await User.find({ _id: { $in: targetIds } })
    .select("firstName lastName email avatar")
    .lean();

  return new Map(
    users.map((user) => [
      String(user._id),
      {
        id: String(user._id),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        avatar: user.avatar || null
      }
    ])
  );
};

export const listUserNotifications = async ({ userId, limit = 50 }) => {
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const contactTargets = await buildContactTargetMap(notifications, userId);

  return notifications.map((notification) => {
    const contactTargetId = resolveContactTargetId(notification);

    return {
      ...notification,
      contactTarget: contactTargetId ? contactTargets.get(String(contactTargetId)) || null : null
    };
  });
};

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
