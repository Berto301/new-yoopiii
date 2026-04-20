import { StatusCodes } from "http-status-codes";
import { Property } from "../properties/property.model.js";
import { Booking } from "./booking.model.js";

export const getBookings = async (req, res) => {
  const userId = req.user.id;
  let query;

  if (req.user.role === "agency") {
    query = { agencyId: req.user.agencyId };
  } else if (req.user.role === "agency_agent" || req.user.role === "independent_agent") {
    query = { $or: [{ agentId: userId }, { userId }] };
  } else if (req.user.role === "proprietaire") {
    const propertyIds = await Property.find({ ownerUserId: userId }).distinct("_id");
    query = propertyIds.length ? { propertyId: { $in: propertyIds } } : { _id: null };
  } else {
    query = { userId };
  }

  const bookings = await Booking.find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(50)
    .populate("propertyId", "title address coverImage price currency status type purpose area rooms bedrooms bathrooms features")
    .populate("agentId", "firstName lastName email avatar")
    .populate("userId", "firstName lastName email avatar")
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

