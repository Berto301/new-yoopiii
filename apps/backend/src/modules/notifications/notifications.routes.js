import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { getNotifications, patchNotificationRead } from "./notifications.controller.js";

export const notificationRouter = Router();

notificationRouter.use(asyncHandler(requireAuth));
notificationRouter.get("/", asyncHandler(getNotifications));
notificationRouter.patch("/:notificationId/read", asyncHandler(patchNotificationRead));
