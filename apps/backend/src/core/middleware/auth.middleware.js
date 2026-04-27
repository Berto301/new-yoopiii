import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AgencyMember } from "../../modules/agencies/models/agency-member.model.js";
import { RoleTemplate } from "../../modules/agencies/models/role-template.model.js";
import { User } from "../../modules/users/user.model.js";

const extractBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

const resolveRoleTemplatePermissions = async (roleTemplateId) => {
  if (!roleTemplateId) {
    return [];
  }

  const roleTemplate = await RoleTemplate.findById(roleTemplateId).lean();
  return roleTemplate?.permissions || [];
};

const resolveRequestPermissionState = async (user) => {
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

export const requireAuth = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub)
      .select("_id firstName lastName email role status agencyId permissionId")
      .lean();

    if (!user || user.status !== "active") {
      throw new AppError("Unauthorized user", StatusCodes.UNAUTHORIZED);
    }

    const permissionState = await resolveRequestPermissionState(user);

    req.user = {
      id: String(user._id),
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      agencyId: user.agencyId ? String(user.agencyId) : null,
      permissionId: permissionState.permissionId,
      permissions: permissionState.permissions
    };

    return next();
  } catch (_error) {
    return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED));
  }
};

export const optionalAuth = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub)
      .select("_id firstName lastName email role status agencyId permissionId")
      .lean();

    if (!user || user.status !== "active") {
      return next();
    }

    const permissionState = await resolveRequestPermissionState(user);

    req.user = {
      id: String(user._id),
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      agencyId: user.agencyId ? String(user.agencyId) : null,
      permissionId: permissionState.permissionId,
      permissions: permissionState.permissions
    };

    return next();
  } catch (_error) {
    return next();
  }
};

export const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError("Forbidden", StatusCodes.FORBIDDEN));
  }

  return next();
};
