import mongoose from "mongoose";

const ownerTenantSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerProperty", default: null },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerContract", default: null },
    fullName: { type: String, required: true, trim: true },
    contact: { type: String, default: "" },
    identityDocument: { type: String, default: "" },
    documentsCount: { type: Number, default: 0 },
    paymentHistoryLabel: { type: String, default: "" }
  },
  { timestamps: true }
);

ownerTenantSchema.index({ ownerId: 1, createdAt: -1 });

export const OwnerTenant = mongoose.model("OwnerTenant", ownerTenantSchema);
