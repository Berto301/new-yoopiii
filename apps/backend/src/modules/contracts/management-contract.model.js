import mongoose from "mongoose";

const contractPartySchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, default: "", trim: true },
    commission: { type: Number, default: 0 },
    fees: { type: Number, default: 0 }
  },
  { _id: false }
);

const contractTenantSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    isMainTenant: { type: Boolean, default: false }
  },
  { _id: false }
);

const contractFinancialSchema = new mongoose.Schema(
  {
    rentAmount: { type: Number, required: true, min: 0 },
    charges: { type: Number, default: 0, min: 0 },
    deposit: { type: Number, default: 0, min: 0 },
    currency: { type: String, required: true, trim: true, default: "XOF" },
    paymentFrequency: { type: String, required: true, trim: true, default: "monthly" },
    paymentMethod: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const contractDistributionSchema = new mongoose.Schema(
  {
    ownerShare: { type: Number, default: 0 },
    agencyShare: { type: Number, default: 0 }
  },
  { _id: false }
);

const contractPaymentTrackingSchema = new mongoose.Schema(
  {
    status: { type: String, default: "", trim: true },
    lastPaymentDate: { type: Date, default: null },
    nextPaymentDate: { type: Date, default: null }
  },
  { _id: false }
);

const contractDocumentsSchema = new mongoose.Schema(
  {
    contractFile: { type: String, default: "", trim: true },
    attachments: { type: [String], default: [] }
  },
  { _id: false }
);

const contractActionsSchema = new mongoose.Schema(
  {
    canPublishProperty: { type: Boolean, default: true },
    canReserveProperty: { type: Boolean, default: true },
    canEditProperty: { type: Boolean, default: false },
    canDeleteProperty: { type: Boolean, default: false },
    publicationOwnerDisplay: {
      showOwnerName: { type: Boolean, default: false },
      showOwnerContact: { type: Boolean, default: false },
      allowDirectOwnerChat: { type: Boolean, default: false }
    }
  },
  { _id: false }
);

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
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null, index: true },
    agency: { type: contractPartySchema, default: () => ({}) },
    agent: { type: contractPartySchema, default: () => ({}) },
    tenants: { type: [contractTenantSchema], default: [] },
    renewable: { type: Boolean, default: false },
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
    financial: { type: contractFinancialSchema, required: true },
    distribution: { type: contractDistributionSchema, default: () => ({}) },
    paymentTracking: { type: contractPaymentTrackingSchema, default: () => ({}) },
    documents: { type: contractDocumentsSchema, default: () => ({}) },
    actions: { type: contractActionsSchema, default: () => ({}) },
    notes: { type: String, default: "", trim: true },
    terms: { type: String, default: "", trim: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

managementContractSchema.index({ ownerUserId: 1, status: 1, endDate: 1 });
managementContractSchema.index({ agencyId: 1, status: 1, endDate: 1 });
managementContractSchema.index({ managerUserId: 1, status: 1, endDate: 1 });

export const ManagementContract = mongoose.model("ManagementContract", managementContractSchema);
