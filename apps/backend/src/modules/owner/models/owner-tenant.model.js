import mongoose from "mongoose";

const ownerTenantSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerProperty", default: null },
    managedPropertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null, index: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: "OwnerContract", default: null },
    managementContractId: { type: mongoose.Schema.Types.ObjectId, ref: "ManagementContract", default: null, index: true },
    linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    cin: { type: String, default: "", trim: true },
    adresse: { type: String, default: "", trim: true },
    sexe: {
      type: String,
      enum: ["homme", "femme", "autre", ""],
      default: ""
    },
    contact: { type: String, default: "" },
    identityDocument: { type: String, default: "" },
    documentsCount: { type: Number, default: 0 },
    paymentHistoryLabel: { type: String, default: "" },
    source: {
      type: String,
      enum: ["manual", "booking_closed_won", "legacy_seed"],
      default: "manual"
    }
  },
  { timestamps: true }
);

ownerTenantSchema.index({ ownerId: 1, createdAt: -1 });
ownerTenantSchema.index(
  { ownerId: 1, managedPropertyId: 1, linkedUserId: 1 },
  { unique: true, partialFilterExpression: { managedPropertyId: { $type: "objectId" }, linkedUserId: { $type: "objectId" } } }
);

export const OwnerTenant = mongoose.model("OwnerTenant", ownerTenantSchema);
