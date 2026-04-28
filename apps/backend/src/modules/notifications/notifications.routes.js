import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import {
  createPushSubscription,
  deletePushSubscription,
  getCurrentPushSubscription,
  getNotifications,
  getPushPublicKey,
  patchNotificationRead
} from "./notifications.controller.js";
import { deletePushSubscriptionSchema, pushSubscriptionSchema } from "./notifications.validation.js";

export const notificationRouter = Router();

notificationRouter.use(asyncHandler(requireAuth));
notificationRouter.get("/", asyncHandler(getNotifications));
notificationRouter.get("/push/public-key", asyncHandler(getPushPublicKey));
notificationRouter.get("/push/subscription", asyncHandler(getCurrentPushSubscription));
notificationRouter.post("/push/subscriptions", validate(pushSubscriptionSchema), asyncHandler(createPushSubscription));
notificationRouter.delete("/push/subscriptions", validate(deletePushSubscriptionSchema), asyncHandler(deletePushSubscription));
notificationRouter.patch("/:notificationId/read", asyncHandler(patchNotificationRead));
