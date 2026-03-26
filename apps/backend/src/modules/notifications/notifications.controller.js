import { StatusCodes } from "http-status-codes";
import { Notification } from "./notification.model.js";

export const getNotifications = async (_req, res) => {
  const notifications = await Notification.find().limit(50).lean();

  res.status(StatusCodes.OK).json({
    success: true,
    data: notifications
  });
};
