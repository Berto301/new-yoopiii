import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { getBookings } from "./bookings.controller.js";

export const bookingRouter = Router();

bookingRouter.use(asyncHandler(requireAuth));
bookingRouter.get("/", asyncHandler(getBookings));
