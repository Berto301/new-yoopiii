import { Router } from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { userRouter } from "./modules/users/users.routes.js";
import { agencyRouter } from "./modules/agencies/agencies.routes.js";
import { propertyRouter } from "./modules/properties/properties.routes.js";
import { bookingRouter } from "./modules/bookings/bookings.routes.js";
import { conversationRouter } from "./modules/conversations/conversations.routes.js";
import { notificationRouter } from "./modules/notifications/notifications.routes.js";
import { ownerRouter } from "./modules/owner/owner.routes.js";
import { contractRouter } from "./modules/contracts/contracts.routes.js";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/agencies", agencyRouter);
router.use("/properties", propertyRouter);
router.use("/bookings", bookingRouter);
router.use("/conversations", conversationRouter);
router.use("/notifications", notificationRouter);
router.use("/owner", ownerRouter);
router.use("/contracts", contractRouter);
