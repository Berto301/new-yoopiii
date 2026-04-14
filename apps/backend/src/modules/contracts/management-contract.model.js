import mongoose from "mongoose";

const managementContractSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, trim: true, unique: true },
    contractType: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "pending_signature", "signed", "accepted", "active", "suspended", "expired", "terminated"],
      default: "draft",
      index: true
    },
    signatureDate: { type: Date, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    renewalDate: { type: Date, default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null, index: true },
    managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    responsibleAgentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    managerRole: {
      type: String,
      enum: ["agency", "independent_agent"],
      required: true,
      index: true
    },
    mandateType: { type: String, default: "", trim: true },
    mission: { type: String, default: "", trim: true },
    commission: { type: String, default: "", trim: true },
    paymentConditions: { type: String, default: "", trim: true },
    noticePeriod: { type: String, default: "", trim: true },
    terminationConditions: { type: String, default: "", trim: true },
    specialClauses: { type: String, default: "", trim: true },
    legalFramework: { type: String, default: "", trim: true },
    jurisdiction: { type: String, default: "", trim: true },
    propertyReference: { type: String, default: "", trim: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

managementContractSchema.index({ ownerUserId: 1, status: 1, endDate: 1 });
managementContractSchema.index({ agencyId: 1, status: 1, endDate: 1 });
managementContractSchema.index({ managerUserId: 1, status: 1, endDate: 1 });

export const ManagementContract = mongoose.model("ManagementContract", managementContractSchema);
