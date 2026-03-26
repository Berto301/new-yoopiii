import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { getBookings } from "./bookings.controller.js";

export const bookingRouter = Router();

bookingRouter.get("/", asyncHandler(getBookings));
