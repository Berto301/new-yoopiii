import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../../modules/users/user.model.js";

const extractBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

export const requireAuth = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("_id firstName lastName email role status").lean();

    if (!user || user.status !== "active") {
      throw new AppError("Unauthorized user", StatusCodes.UNAUTHORIZED);
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };

    return next();
  } catch (error) {
    return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED));
  }
};

export const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError("Forbidden", StatusCodes.FORBIDDEN));
  }

  return next();
};
