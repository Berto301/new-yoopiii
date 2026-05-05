import mongoose from "mongoose";

export const CRM_PIPELINE_STAGES = [
  "new",
  "qualified",
  "visited",
  "proposal_sent",
  "negotiation",
  "won",
  "lost"
];

const crmMetadataSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true, unique: true, index: true },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null, index: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    pipelineStage: { type: String, enum: CRM_PIPELINE_STAGES, default: "new", index: true },
    dataUsed: { type: [String], default: [] },
    status: { type: String, enum: ["active", "paused", "closed"], default: "active", index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    nextAction: { type: String, default: "", trim: true, maxlength: 240 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

crmMetadataSchema.index({ agencyId: 1, pipelineStage: 1, updatedAt: -1 });
crmMetadataSchema.index({ agentId: 1, pipelineStage: 1, updatedAt: -1 });

export const CrmMetadata = mongoose.model("CrmMetadata", crmMetadataSchema);
