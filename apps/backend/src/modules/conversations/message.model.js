import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "appointment", "communication_report", "visit_report"],
      default: "text"
    },
    attachments: { type: [String], default: [] },
    appointment: { type: mongoose.Schema.Types.Mixed, default: null },
    communicationReport: { type: mongoose.Schema.Types.Mixed, default: null },
    visitReport: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, readAt: 1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
