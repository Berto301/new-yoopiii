import mongoose from "mongoose";

const agencyStatsSnapshotSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    periodType: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    activeAgents: { type: Number, default: 0 },
    propertiesPublished: { type: Number, default: 0 },
    bookingsCount: { type: Number, default: 0 },
    completedVisits: { type: Number, default: 0 },
    expensesTotal: { type: Number, default: 0 },
    revenueEstimated: { type: Number, default: 0 },
    averageAgentRating: { type: Number, default: 0 },
    teamScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

agencyStatsSnapshotSchema.index({ agencyId: 1, periodType: 1, periodStart: -1 });

export const AgencyStatsSnapshot = mongoose.model("AgencyStatsSnapshot", agencyStatsSnapshotSchema);
