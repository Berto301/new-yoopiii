import mongoose from "mongoose";
import { pointSchema } from "../shared/schemas/location.schema.js";

const propertyMediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video", "virtual_tour", "document"],
      default: "image"
    },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["house", "land", "apartment", "commercial", "office", "warehouse"],
      required: true
    },
    purpose: {
      type: String,
      enum: ["sale", "rent"],
      required: true
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "XOF" },
    area: { type: Number, default: 0 },
    rooms: { type: Number, default: 0 },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    features: { type: [String], default: [] },
    address: { type: String, required: true },
    location: { type: pointSchema, required: true },
    coverImage: { type: String, default: null },
    media: { type: [propertyMediaSchema], default: [] },
    has3DView: { type: Boolean, default: false },
    threeDUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["draft", "published", "reserved", "sold", "rented", "archived"],
      default: "draft"
    },
    publicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    ownerType: {
      type: String,
      enum: ["independent_agent", "agency"],
      required: true
    },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  },
  { timestamps: true }
);

propertySchema.index({ location: "2dsphere" });
propertySchema.index({ purpose: 1, type: 1, status: 1, publicationStatus: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ bedrooms: 1, bathrooms: 1 });
propertySchema.index({ agencyId: 1, agentId: 1 });
propertySchema.index({ createdAt: -1 });

export const Property = mongoose.model("Property", propertySchema);
