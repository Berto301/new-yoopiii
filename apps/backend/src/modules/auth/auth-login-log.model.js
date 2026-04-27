import mongoose from "mongoose";

const authLoginLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    provider: { type: String, enum: ["password", "google", "facebook", "2fa"], required: true },
    status: { type: String, enum: ["success", "blocked", "failed", "2fa_required"], required: true },
    reason: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" }
  },
  { timestamps: true }
);

authLoginLogSchema.index({ userId: 1, createdAt: -1 });
authLoginLogSchema.index({ email: 1, createdAt: -1 });

export const AuthLoginLog = mongoose.model("AuthLoginLog", authLoginLogSchema);
