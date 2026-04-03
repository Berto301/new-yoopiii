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
    kind: {
      type: String,
      enum: ["profile-avatar", "agency-logo", "agency-cover"],
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
    partialFilterExpression: { ownerUserId: { $type: "objectId" } }
  }
);

dataFileSchema.index(
  { ownerAgencyId: 1, kind: 1 },
  {
    unique: true,
    partialFilterExpression: { ownerAgencyId: { $type: "objectId" } }
  }
);

export const DataFile = mongoose.model("DataFile", dataFileSchema);
