import mongoose from "mongoose";

const propertyFavoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

propertyFavoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });
propertyFavoriteSchema.index({ propertyId: 1, createdAt: -1 });

export const PropertyFavorite = mongoose.model("PropertyFavorite", propertyFavoriteSchema);
