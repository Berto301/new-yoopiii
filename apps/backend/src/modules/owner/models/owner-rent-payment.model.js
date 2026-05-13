import mongoose from "mongoose";

const ownerRentPaymentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerProperty", default: null },
    managedPropertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerTenant", default: null },
    managementContractId: { type: mongoose.Schema.Types.ObjectId, ref: "ManagementContract", default: null, index: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", trim: true, uppercase: true },
    status: {
      type: String,
      enum: ["paid", "late", "pending", "pending_approval", "approved", "rejected", "cancelled"],
      default: "pending"
    },
    paymentDate: { type: Date, default: null },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "mobile_money", "card", "check", "other", ""],
      default: ""
    },
    paymentReference: { type: String, default: "", trim: true },
    proofUrl: { type: String, default: "", trim: true },
    proofName: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    receiptNumber: { type: String, default: "" },
    receiptGeneratedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    source: {
      type: String,
      enum: ["tenant", "owner", "system", "legacy"],
      default: "legacy"
    }
  },
  { timestamps: true }
);

ownerRentPaymentSchema.index({ ownerId: 1, dueDate: -1 });
ownerRentPaymentSchema.index({ ownerId: 1, managedPropertyId: 1, dueDate: -1 });
ownerRentPaymentSchema.index({ tenantId: 1, dueDate: -1 });

export const OwnerRentPayment = mongoose.model("OwnerRentPayment", ownerRentPaymentSchema);
