import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { pointSchema } from "../shared/schemas/location.schema.js";

const socialProviderSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["google", "facebook"],
      required: true
    },
    providerId: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    linkedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const agentScoreDetailsSchema = new mongoose.Schema(
  {
    ratingScore: { type: Number, default: 0, min: 0, max: 100 },
    propertyScore: { type: Number, default: 0, min: 0, max: 100 },
    contractScore: { type: Number, default: 0, min: 0, max: 100 },
    clientRelationScore: { type: Number, default: 0, min: 0, max: 100 },
    recommendations: { type: [String], default: [] },
    calculatedAt: { type: Date, default: null }
  },
  { _id: false }
);
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    cin: { type: String, trim: true, default: "" },
    adresse: { type: String, trim: true, default: "" },
    sexe: {
      type: String,
      enum: ["homme", "femme", "autre", ""],
      default: ""
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "proprietaire", "independent_agent", "agency", "agency_agent", "admin"],
      default: "user"
    },
    permissionId: { type: mongoose.Schema.Types.ObjectId, ref: "RoleTemplate", default: null },
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
      notificationsEnabled: { type: Boolean, default: true },
      pushNotificationsEnabled: { type: Boolean, default: false },
      language: {
        type: String,
        enum: ["en", "fr"],
        default: "fr"
      },
      theme: {
        type: String,
        enum: ["dark", "light"],
        default: "dark"
      },
      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: "USD"
      },
      contractDefaultCommission: {
        type: Number,
        min: 0,
        default: 0
      },
      smartMatching: {
        enabled: { type: Boolean, default: false },
        budgetReal: {
          type: Number,
          min: 0,
          default: null
        },
        purpose: {
          type: String,
          enum: ["sale", "rent", ""],
          default: ""
        },
        propertyTypes: {
          type: [String],
          default: []
        },
        location: {
          enabled: { type: Boolean, default: false },
          lat: { type: Number, default: null },
          lng: { type: Number, default: null },
          label: { type: String, trim: true, default: "" }
        },
        searchRadiusKm: {
          type: Number,
          enum: [1, 5, 100],
          default: 5
        },
        criteria: {
          version: { type: Number, default: 1 },
          custom: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
          }
        }
      }
    },
    socialProviders: { type: [socialProviderSchema], default: [] },
    twoFactor: {
      isEnabled: { type: Boolean, default: false },
      method: {
        type: String,
        enum: ["authenticator", "email"],
        default: "authenticator"
      },
      secretHash: { type: String, default: "" },
      secretEncrypted: {
        iv: { type: String, default: "" },
        value: { type: String, default: "" },
        tag: { type: String, default: "" }
      },
      pending: {
        method: {
          type: String,
          enum: ["authenticator", "email", ""],
          default: ""
        },
        secretHash: { type: String, default: "" },
        secretEncrypted: {
          iv: { type: String, default: "" },
          value: { type: String, default: "" },
          tag: { type: String, default: "" }
        },
        otpHash: { type: String, default: "" },
        expiresAt: { type: Date, default: null }
      },
      challenge: {
        tokenHash: { type: String, default: "" },
        otpHash: { type: String, default: "" },
        expiresAt: { type: Date, default: null },
        failedAttempts: { type: Number, default: 0 },
        lockedUntil: { type: Date, default: null }
      }
    },
    lastLoginAt: { type: Date, default: null },
    score: { type: Number, default: 0, min: 0, max: 100 },
    scoreDetails: { type: agentScoreDetailsSchema, default: () => ({}) }
  },
  {
    timestamps: true
  }
);

userSchema.index({ location: "2dsphere" });
userSchema.index({ role: 1, score: -1 });
userSchema.index(
  { "socialProviders.provider": 1, "socialProviders.providerId": 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      "socialProviders.provider": { $exists: true },
      "socialProviders.providerId": { $exists: true }
    }
  }
);

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

export const User = mongoose.model("User", userSchema);
