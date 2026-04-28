import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { listUserNotifications, markNotificationRead } from "./notifications.service.js";
import { getPushPublicKeyDescriptor, getPushSubscriptionStatus, removePushSubscription, upsertPushSubscription } from "./push.service.js";

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

export const getPushPublicKey = async (_req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    data: getPushPublicKeyDescriptor()
  });
};

export const getCurrentPushSubscription = async (req, res) => {
  const status = await getPushSubscriptionStatus({ userId: req.user.id });

  res.status(StatusCodes.OK).json({
    success: true,
    data: status
  });
};

export const createPushSubscription = async (req, res) => {
  const subscription = await upsertPushSubscription({
    userId: req.user.id,
    subscription: req.validated.body,
    userAgent: req.headers["user-agent"] || ""
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      id: String(subscription._id),
      endpoint: subscription.endpoint
    }
  });
};

export const deletePushSubscription = async (req, res) => {
  await removePushSubscription({
    userId: req.user.id,
    endpoint: req.validated.body.endpoint
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: { deleted: true }
  });
};
