import mongoose from "mongoose";

export const OWNER_EXPENSE_TYPES = ["actif", "passif"];

export const OWNER_EXPENSE_CATEGORIES = [
  "rent_income",
  "sale_price",
  "property_income",
  "maintenance",
  "administrative",
  "commission",
  "other_charge"
];

const ownerExpenseSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null, index: true },
    propertyLabel: { type: String, default: "", trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    type: {
      type: String,
      enum: OWNER_EXPENSE_TYPES,
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: OWNER_EXPENSE_CATEGORIES,
      required: true,
      index: true
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", trim: true, uppercase: true },
    expenseDate: { type: Date, required: true, index: true },
    budgetAmount: { type: Number, default: 0, min: 0 },
    source: {
      type: String,
      enum: ["manual", "maintenance", "contract", "property"],
      default: "manual",
      index: true
    },
    sourceRefId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    sourceMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

ownerExpenseSchema.index({ ownerId: 1, expenseDate: -1, type: 1, propertyId: 1 });
ownerExpenseSchema.index({ ownerId: 1, category: 1, expenseDate: -1 });
ownerExpenseSchema.index({ ownerId: 1, source: 1, sourceRefId: 1 });

export const OwnerExpense = mongoose.model("OwnerExpense", ownerExpenseSchema);
