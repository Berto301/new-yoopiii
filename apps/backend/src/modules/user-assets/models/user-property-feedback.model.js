import mongoose from "mongoose";

const userPropertyFeedbackSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerTenant", default: null, index: true },
    managementContractId: { type: mongoose.Schema.Types.ObjectId, ref: "ManagementContract", default: null, index: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    subject: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "handled"],
      default: "new",
      index: true
    },
    handledAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userPropertyFeedbackSchema.index({ ownerId: 1, propertyId: 1, createdAt: -1 });
userPropertyFeedbackSchema.index({ userId: 1, propertyId: 1, createdAt: -1 });

export const UserPropertyFeedback = mongoose.model("UserPropertyFeedback", userPropertyFeedbackSchema);
