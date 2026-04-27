import fs from "node:fs/promises";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { DataFile } from "../files/data-file.model.js";
import { User } from "./user.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { RoleTemplate } from "../agencies/models/role-template.model.js";

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
  location: user.location || null
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

  user.preferences = {
    ...(user.preferences || {}),
    language: payload.language,
    theme: payload.theme,
    currency: payload.currency,
    contractDefaultCommission: canManageCommission
      ? payload.contractDefaultCommission
      : Number(user.preferences?.contractDefaultCommission || 0)
  };

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
