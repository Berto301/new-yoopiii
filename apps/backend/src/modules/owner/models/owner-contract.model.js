import mongoose from "mongoose";

const ownerContractSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerProperty", default: null },
    title: { type: String, required: true, trim: true },
    partnerName: { type: String, required: true, trim: true },
    partnerType: {
      type: String,
      enum: ["agency", "independent_agent"],
      required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    renewalDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active"
    }
  },
  { timestamps: true }
);

ownerContractSchema.index({ ownerId: 1, status: 1, endDate: 1 });

export const OwnerContract = mongoose.model("OwnerContract", ownerContractSchema);
