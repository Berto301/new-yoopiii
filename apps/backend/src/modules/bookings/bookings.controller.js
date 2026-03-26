import { StatusCodes } from "http-status-codes";
import { Booking } from "./booking.model.js";

export const getBookings = async (_req, res) => {
  const bookings = await Booking.find().limit(50).lean();

  res.status(StatusCodes.OK).json({
    success: true,
    data: bookings
  });
};
