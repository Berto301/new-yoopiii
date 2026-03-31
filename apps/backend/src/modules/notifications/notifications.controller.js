import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { listUserNotifications, markNotificationRead } from "./notifications.service.js";

export const getNotifications = async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const notifications = await listUserNotifications({ userId: req.user.id, limit });

  res.status(StatusCodes.OK).json({
    success: true,
    data: notifications
  });
};

export const patchNotificationRead = async (req, res) => {
  const notification = await markNotificationRead({
    notificationId: req.params.notificationId,
    userId: req.user.id
  });

  if (!notification) {
    throw new AppError("Notification not found", StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: notification
  });
};
