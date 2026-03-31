import mongoose from "mongoose";

const propertyViewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    viewedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["search", "map", "detail", "favorite", "share"],
      default: "detail"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

propertyViewSchema.index({ userId: 1, propertyId: 1 }, { unique: true });
propertyViewSchema.index({ userId: 1, viewedAt: -1 });

export const PropertyView = mongoose.model("PropertyView", propertyViewSchema);
