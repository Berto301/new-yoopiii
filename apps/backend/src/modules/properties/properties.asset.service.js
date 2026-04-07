import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";

const ALLOWED_PROPERTY_UPLOAD_ROLES = ["agency", "agency_agent", "independent_agent"];

export const uploadPropertyAssetFile = async ({ actor, assetKind, mediaType, file }) => {
  if (!ALLOWED_PROPERTY_UPLOAD_ROLES.includes(actor?.role)) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (!file) {
    throw new AppError("Property file is required", StatusCodes.BAD_REQUEST);
  }

  if (assetKind === "cover" && !file.mimetype?.startsWith("image/")) {
    throw new AppError("Property cover must be an image file", StatusCodes.BAD_REQUEST);
  }

  if (assetKind === "media") {
    if (!mediaType) {
      throw new AppError("Media type is required", StatusCodes.BAD_REQUEST);
    }

    if (!file.mimetype?.startsWith(`${mediaType}/`)) {
      throw new AppError(`Property media must be a ${mediaType} file`, StatusCodes.BAD_REQUEST);
    }
  }

  return {
    assetKind,
    mediaType: mediaType || (assetKind === "cover" ? "image" : null),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    publicPath: `/uploads/properties/${file.filename}`
  };
};
