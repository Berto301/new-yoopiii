import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true, trim: true },
    expirationTime: { type: Date, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    userAgent: { type: String, default: "" },
    lastSuccessAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
