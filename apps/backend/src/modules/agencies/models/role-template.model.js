import mongoose from "mongoose";

const roleTemplateSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    permissions: { type: [String], required: true, default: [] },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

roleTemplateSchema.index({ agencyId: 1, key: 1 }, { unique: true });

export const RoleTemplate = mongoose.model("RoleTemplate", roleTemplateSchema);
