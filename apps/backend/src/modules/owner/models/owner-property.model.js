import mongoose from "mongoose";

const ownerPropertySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    surface: { type: Number, default: 0 },
    location: { type: String, required: true, trim: true },
    photosCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["loue", "libre", "en_travaux"],
      default: "libre"
    },
    historyLabel: { type: String, default: "" },
    monthlyRevenue: { type: Number, default: 0 },
    annualYieldRate: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 }
  },
  { timestamps: true }
);

ownerPropertySchema.index({ ownerId: 1, createdAt: -1 });

export const OwnerProperty = mongoose.model("OwnerProperty", ownerPropertySchema);
