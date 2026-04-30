import fs from "node:fs/promises";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { DataFile } from "../files/data-file.model.js";
import { User } from "./user.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { RoleTemplate } from "../agencies/models/role-template.model.js";

const DEFAULT_SMART_MATCHING = {
  enabled: false,
  budgetReal: null,
  purpose: "",
  propertyTypes: [],
  location: {
    enabled: false,
    lat: null,
    lng: null,
    label: ""
  },
  searchRadiusKm: 5,
  criteria: {
    version: 1,
    custom: {}
  }
};

const normalizeSmartMatchingPreferences = (input) => {
  const source = input && typeof input === "object" ? input : {};

  return {
    enabled: Boolean(source.enabled),
    budgetReal: source.budgetReal == null || source.budgetReal === "" ? null : Number(source.budgetReal),
    purpose: source.purpose || "",
    propertyTypes: Array.isArray(source.propertyTypes) ? source.propertyTypes.filter(Boolean) : [],
    location: {
      enabled: Boolean(source.location?.enabled),
      lat: source.location?.enabled && source.location?.lat != null ? Number(source.location.lat) : null,
      lng: source.location?.enabled && source.location?.lng != null ? Number(source.location.lng) : null,
      label: source.location?.enabled ? source.location?.label || "" : ""
    },
    searchRadiusKm: source.searchRadiusKm || DEFAULT_SMART_MATCHING.searchRadiusKm,
    criteria: {
      version: Number(source.criteria?.version || DEFAULT_SMART_MATCHING.criteria.version),
      custom: source.criteria?.custom && typeof source.criteria.custom === "object" ? source.criteria.custom : {}
    }
  };
};

const resolveUserPermissions = async (user) => {
  if (user.role === "agency" && user.permissionId) {
    const roleTemplate = await RoleTemplate.findById(user.permissionId).lean();
    return roleTemplate?.permissions || [];
  }

  if (user.role === "agency_agent" && user.agencyId) {
    const member = await AgencyMember.findOne({
      agencyId: user.agencyId,
      userId: user._id,
      status: "active"
    }).lean();

    if (member?.permissionId) {
      const roleTemplate = await RoleTemplate.findById(member.permissionId).lean();
      if (roleTemplate?.permissions?.length) {
        return roleTemplate.permissions;
      }
    }

    return member?.permissions || [];
  }

  return [];
};

const sanitizeUser = async (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone || "",
  cin: user.cin || "",
  adresse: user.adresse || "",
  sexe: user.sexe || "",
  avatar: user.avatar || null,
  role: user.role,
  agencyId: user.agencyId || null,
  permissionId: user.permissionId ? String(user.permissionId) : null,
  permissions: await resolveUserPermissions(user),
  preferences: user.preferences,
  socialProviders: (user.socialProviders || []).map((provider) => ({
    provider: provider.provider,
    providerId: provider.providerId,
    email: provider.email,
    linkedAt: provider.linkedAt
  })),
  twoFactor: {
    isEnabled: Boolean(user.twoFactor?.isEnabled),
    method: user.twoFactor?.method || "authenticator"
  },
  location: user.location || null,
  score: user.score || 0,
  scoreDetails: user.scoreDetails || null
});

const deleteFileIfExists = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  try {
    await fs.unlink(storagePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
};

export const listUsers = () => User.find().select("-passwordHash").limit(50).lean();

export const getUserProfileById = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash").lean();

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  return sanitizeUser(user);
};

export const updateMyProfile = async ({ userId, payload }) => {
  const existingUser = await User.findOne({ email: payload.email, _id: { $ne: userId } }).lean();

  if (existingUser) {
    throw new AppError("Email already in use", StatusCodes.CONFLICT);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  user.firstName = payload.firstName;
  user.lastName = payload.lastName;
  user.email = payload.email;
  user.phone = payload.phone || "";
  user.cin = payload.cin || "";
  user.adresse = payload.adresse || "";
  user.sexe = payload.sexe || "";
  user.avatar = payload.avatar || null;
  await user.save();

  return sanitizeUser(user.toObject());
};

export const updateMyPreferences = async ({ userId, payload }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  const canManageCommission = ["agency", "agency_agent", "independent_agent"].includes(user.role);
  const normalizedSmartMatching = user.role === "user"
    ? normalizeSmartMatchingPreferences(payload.smartMatching)
    : normalizeSmartMatchingPreferences(user.preferences?.smartMatching || DEFAULT_SMART_MATCHING);

  if (!user.preferences || typeof user.preferences !== "object") {
    user.preferences = {};
  }

  user.preferences.notificationsEnabled = payload.notificationsEnabled ?? true;
  user.preferences.pushNotificationsEnabled = user.role === "user"
    ? Boolean(payload.pushNotificationsEnabled)
    : Boolean(user.preferences?.pushNotificationsEnabled);
  user.preferences.language = payload.language;
  user.preferences.theme = payload.theme;
  user.preferences.currency = payload.currency;
  user.preferences.contractDefaultCommission = canManageCommission
    ? payload.contractDefaultCommission
    : Number(user.preferences?.contractDefaultCommission || 0);
  user.preferences.smartMatching = normalizedSmartMatching;

  await user.save();

  return sanitizeUser(user.toObject());
};

export const uploadMyProfileAvatar = async ({ userId, file }) => {
  if (!file) {
    throw new AppError("Profile image file is required", StatusCodes.BAD_REQUEST);
  }

  if (!file.mimetype?.startsWith("image/")) {
    await deleteFileIfExists(file.path);
    throw new AppError("Only image files are allowed", StatusCodes.BAD_REQUEST);
  }

  const user = await User.findById(userId);

  if (!user) {
    await deleteFileIfExists(file.path);
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  const publicPath = `/uploads/profile/${file.filename}`;
  const previousDataFile = await DataFile.findOne({ ownerUserId: userId, kind: "profile-avatar" });

  if (previousDataFile?.storagePath && previousDataFile.storagePath !== file.path) {
    await deleteFileIfExists(previousDataFile.storagePath);
  }

  await DataFile.findOneAndUpdate(
    { ownerUserId: userId, kind: "profile-avatar" },
    {
      ownerUserId: userId,
      kind: "profile-avatar",
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path,
      publicPath
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  user.avatar = publicPath;
  await user.save();

  return sanitizeUser(user.toObject());
};

export const changeMyPassword = async ({ userId, payload }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  const isCurrentPasswordValid = await user.comparePassword(payload.currentPassword);

  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is invalid", StatusCodes.BAD_REQUEST);
  }

  user.passwordHash = await User.hashPassword(payload.newPassword);
  await user.save();

  return { updated: true };
};
