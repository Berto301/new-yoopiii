import mongoose from "mongoose";

const agencyExpenseSchema = new mongoose.Schema(
  {
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
    label: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["marketing", "transport", "salary", "office", "legal", "maintenance", "other"],
      required: true
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "XOF" },
    expenseDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: "" },
    attachments: { type: [String], default: [] }
  },
  { timestamps: true }
);

agencyExpenseSchema.index({ agencyId: 1, expenseDate: -1, status: 1 });
agencyExpenseSchema.index({ agencyId: 1, category: 1 });

export const AgencyExpense = mongoose.model("AgencyExpense", agencyExpenseSchema);
