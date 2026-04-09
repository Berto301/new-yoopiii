import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";

export const uploadConversationFiles = async ({ actor, files }) => {
  if (!actor?.id) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (!files?.length) {
    throw new AppError("Au moins un fichier est requis", StatusCodes.BAD_REQUEST);
  }

  return files.map((file) => ({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    publicPath: `/uploads/conversations/${file.filename}`
  }));
};
