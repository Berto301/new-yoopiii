import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { User } from "./user.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { RoleTemplate } from "../agencies/models/role-template.model.js";

const resolveUserPermissions = async (user) => {
  if (user.role === "agency" && user.permissionIds) {
    const roleTemplate = await RoleTemplate.findById(user.permissionIds).lean();
    return roleTemplate?.permissions || [];
  }

  if (user.role === "agency_agent" && user.agencyId) {
    const member = await AgencyMember.findOne({
      agencyId: user.agencyId,
      userId: user._id,
      status: "active"
    }).lean();

    if (member?.permissionIds) {
      const roleTemplate = await RoleTemplate.findById(member.permissionIds).lean();
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
  avatar: user.avatar || null,
  role: user.role,
  agencyId: user.agencyId || null,
  permissionIds: user.permissionIds ? String(user.permissionIds) : null,
  permissions: await resolveUserPermissions(user),
  preferences: user.preferences,
  location: user.location || null
});

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
  user.avatar = payload.avatar || null;
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
