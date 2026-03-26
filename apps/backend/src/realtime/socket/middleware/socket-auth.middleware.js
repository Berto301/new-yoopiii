import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../core/errors/app-error.js";
import { verifyAccessToken } from "../../../core/utils/jwt.js";
import { User } from "../../../modules/users/user.model.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED));
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("_id firstName lastName email role status").lean();

    if (!user || user.status !== "active") {
      return next(new AppError("Unauthorized user", StatusCodes.UNAUTHORIZED));
    }

    socket.data.user = {
      id: String(user._id),
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };

    return next();
  } catch (_error) {
    return next(new AppError("Authentication required", StatusCodes.UNAUTHORIZED));
  }
};
