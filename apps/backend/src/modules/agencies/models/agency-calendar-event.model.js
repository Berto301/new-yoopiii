import mongoose from "mongoose";

const agencyCalendarEventSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["visit", "meeting", "follow_up", "internal", "blocked_slot"],
      required: true
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "cancelled", "completed"],
      default: "scheduled"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

agencyCalendarEventSchema.index({ agencyId: 1, startAt: 1, endAt: 1 });
agencyCalendarEventSchema.index({ agentId: 1, startAt: 1 });

export const AgencyCalendarEvent = mongoose.model("AgencyCalendarEvent", agencyCalendarEventSchema);
