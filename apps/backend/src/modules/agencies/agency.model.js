import mongoose from "mongoose";
import { pointSchema } from "../shared/schemas/location.schema.js";

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
    }
  },
  { timestamps: true }
);

agencySchema.index({ location: "2dsphere" });

export const Agency = mongoose.model("Agency", agencySchema);
