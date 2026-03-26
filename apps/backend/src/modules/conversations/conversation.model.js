import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["private"],
      default: "private"
    },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    lastMessageAt: { type: Date, default: null },
    lastMessagePreview: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
conversationSchema.index({ propertyId: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
