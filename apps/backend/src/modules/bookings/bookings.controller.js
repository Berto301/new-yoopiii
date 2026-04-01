import { StatusCodes } from "http-status-codes";
import { Booking } from "./booking.model.js";

export const getBookings = async (req, res) => {
  const userId = req.user.id;
  const query =
    req.user.role === "agency"
      ? { agencyId: req.user.agencyId }
      : req.user.role === "agency_agent" || req.user.role === "independent_agent"
        ? { $or: [{ agentId: userId }, { userId }] }
        : { userId };

  const bookings = await Booking.find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(50)
    .populate("propertyId", "title address coverImage price currency status")
    .populate("agentId", "firstName lastName")
    .populate("userId", "firstName lastName email")
    .lean();

  res.status(StatusCodes.OK).json({
    success: true,
    data: bookings.map((booking) => ({
      ...booking,
      property: booking.propertyId,
      agent: booking.agentId,
      customer: booking.userId
    }))
  });
};
