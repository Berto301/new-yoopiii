import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { getNotifications } from "./notifications.controller.js";

export const notificationRouter = Router();

notificationRouter.get("/", asyncHandler(getNotifications));
