import mongoose from "mongoose";

const dataFileSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    ownerAgencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      default: null,
      index: true
    },
    ownerContractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ManagementContract",
      default: null,
      index: true
    },
    kind: {
      type: String,
      enum: [
        "profile-avatar",
        "agency-logo",
        "agency-cover",
        "contract_signed",
        "owner_identity",
        "agent_identity",
        "agency_documents",
        "property_document",
        "annex",
        "legal_document"
      ],
      required: true,
      index: true
    },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    storagePath: { type: String, required: true, trim: true },
    publicPath: { type: String, required: true, trim: true }
  },
  {
    timestamps: true
  }
);

dataFileSchema.index(
  { ownerUserId: 1, kind: 1 },
  {
    unique: true,
    partialFilterExpression: {
      ownerUserId: { $type: "objectId" },
      kind: { $in: ["profile-avatar"] }
    }
  }
);

dataFileSchema.index(
  { ownerAgencyId: 1, kind: 1 },
  {
    unique: true,
    partialFilterExpression: {
      ownerAgencyId: { $type: "objectId" },
      kind: { $in: ["agency-logo", "agency-cover"] }
    }
  }
);

export const DataFile = mongoose.model("DataFile", dataFileSchema);
