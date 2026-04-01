import { signAccessToken } from "../../core/utils/jwt.js";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Agency } from "../agencies/agency.model.js";
import { AGENCY_ROLE_PERMISSIONS } from "../agencies/constants/agency-permissions.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { RoleTemplate } from "../agencies/models/role-template.model.js";
import { User } from "../users/user.model.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

const buildUniqueAgencySlug = async (companyName) => {
  const baseSlug = slugify(companyName) || `agency-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;

  while (await Agency.findOne({ slug }).lean()) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

const resolveRoleTemplatePermissions = async (roleTemplateId) => {
  if (!roleTemplateId) {
    return [];
  }

  const roleTemplate = await RoleTemplate.findById(roleTemplateId).lean();
  return roleTemplate?.permissions || [];
};

const resolveUserPermissionState = async (user) => {
  if (user.role === "agency") {
    return {
      permissionId: user.permissionId ? String(user.permissionId) : null,
      permissions: await resolveRoleTemplatePermissions(user.permissionId)
    };
  }

  if (user.role === "agency_agent" && user.agencyId) {
    const member = await AgencyMember.findOne({
      agencyId: user.agencyId,
      userId: user._id,
      status: "active"
    }).lean();

    return {
      permissionId: member?.permissionId ? String(member.permissionId) : null,
      permissions: member?.permissionId
        ? await resolveRoleTemplatePermissions(member.permissionId)
        : member?.permissions || []
    };
  }

  return {
    permissionId: user.permissionId ? String(user.permissionId) : null,
    permissions: []
  };
};

const formatAuthUser = async (user) => {
  const permissionState = await resolveUserPermissionState(user);

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    agencyId: user.agencyId || null,
    permissionId: permissionState.permissionId,
    permissions: permissionState.permissions
  };
};

export const registerUser = async (payload) => {
  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new AppError("Email already in use", StatusCodes.CONFLICT);
  }

  const passwordHash = await User.hashPassword(payload.password);

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    permissionId: null,
    passwordHash
  });

  if (payload.role === "agency") {
    const slug = await buildUniqueAgencySlug(payload.companyName);

    const agency = await Agency.create({
      name: payload.companyName,
      slug,
      contactEmail: payload.email,
      contactPhone: payload.phone || "",
      ownerUserId: user._id,
      status: "active"
    });

    const ownerRoleTemplate = await RoleTemplate.create({
      agencyId: agency._id,
      name: "owner",
      key: "owner",
      permissions: AGENCY_ROLE_PERMISSIONS.owner,
      isSystem: true,
      createdBy: user._id
    });

    user.agencyId = agency._id;
    user.permissionId = ownerRoleTemplate._id;
    await user.save();

    await AgencyMember.create({
      agencyId: agency._id,
      userId: user._id,
      role: "owner",
      permissionId: ownerRoleTemplate._id,
      permissions: ownerRoleTemplate.permissions,
      status: "active",
      invitedBy: user._id,
      jobTitle: "Owner"
    });
  }

  return {
    user: await formatAuthUser(user),
    accessToken: signAccessToken(user)
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: await formatAuthUser(user),
    accessToken: signAccessToken(user)
  };
};
