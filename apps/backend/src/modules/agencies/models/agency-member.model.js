import mongoose from "mongoose";

const agencyMemberSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "manager", "supervisor", "agent", "assistant", "viewer"],
      required: true
    },
    permissions: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["invited", "active", "inactive", "removed"],
      default: "active"
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    jobTitle: { type: String, default: "" }
  },
  { timestamps: true }
);

agencyMemberSchema.index({ agencyId: 1, userId: 1 }, { unique: true });
agencyMemberSchema.index({ agencyId: 1, role: 1, status: 1 });

export const AgencyMember = mongoose.model("AgencyMember", agencyMemberSchema);
