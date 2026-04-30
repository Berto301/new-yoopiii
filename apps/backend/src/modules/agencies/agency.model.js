import mongoose from "mongoose";
import { pointSchema } from "../shared/schemas/location.schema.js";

const agencyScoreDetailsSchema = new mongoose.Schema(
  {
    agentsScore: { type: Number, default: 0, min: 0, max: 100 },
    managedPropertiesScore: { type: Number, default: 0, min: 0, max: 100 },
    closedDealsScore: { type: Number, default: 0, min: 0, max: 100 },
    recommendations: { type: [String], default: [] },
    calculatedAt: { type: Date, default: null }
  },
  { _id: false }
);
const agencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    logo: { type: String, default: null },
    coverImage: { type: String, default: null },
    description: { type: String, default: "" },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    location: { type: pointSchema, default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ratingAverage: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active"
    },
    subscriptionPlan: {
      type: String,
      enum: ["free", "starter", "growth", "enterprise"],
      default: "free"
    },
    score: { type: Number, default: 0, min: 0, max: 100 },
    scoreDetails: { type: agencyScoreDetailsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

agencySchema.index({ location: "2dsphere" });
agencySchema.index({ score: -1 });

export const Agency = mongoose.model("Agency", agencySchema);
