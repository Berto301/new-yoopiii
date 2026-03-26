import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { pointSchema } from "../shared/schemas/location.schema.js";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "independent_agent", "agency", "agency_agent", "admin"],
      default: "user"
    },
    avatar: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active"
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      default: null
    },
    location: {
      type: pointSchema,
      default: null
    },
    preferences: {
      radiusInKm: { type: Number, default: 10 },
      notificationsEnabled: { type: Boolean, default: true }
    },
    lastLoginAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

userSchema.index({ location: "2dsphere" });

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

export const User = mongoose.model("User", userSchema);
