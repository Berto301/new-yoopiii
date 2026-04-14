import mongoose from "mongoose";

const ownerMaintenanceTicketSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerProperty", default: null },
    title: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium"
    },
    assignee: { type: String, default: "" },
    status: {
      type: String,
      enum: ["planned", "in_progress", "closed"],
      default: "planned"
    },
    lastUpdateLabel: { type: String, default: "" }
  },
  { timestamps: true }
);

ownerMaintenanceTicketSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });

export const OwnerMaintenanceTicket = mongoose.model("OwnerMaintenanceTicket", ownerMaintenanceTicketSchema);
