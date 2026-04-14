import mongoose from "mongoose";

const ownerRentPaymentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerProperty", default: null },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerTenant", default: null },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["paid", "late", "pending"],
      default: "pending"
    },
    receiptNumber: { type: String, default: "" }
  },
  { timestamps: true }
);

ownerRentPaymentSchema.index({ ownerId: 1, dueDate: -1 });

export const OwnerRentPayment = mongoose.model("OwnerRentPayment", ownerRentPaymentSchema);
