import mongoose from "mongoose";

const agentReviewSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    description: { type: String, default: "", trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

agentReviewSchema.index({ agentId: 1, userId: 1 }, { unique: true });
agentReviewSchema.index({ agentId: 1, createdAt: -1 });

export const AgentReview = mongoose.model("AgentReview", agentReviewSchema);
