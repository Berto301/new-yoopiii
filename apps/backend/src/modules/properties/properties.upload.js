import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const propertyUploadDirectory = path.resolve(currentDirectory, "../../../uploads/properties");

const ensurePropertyUploadDirectory = () => {
  fs.mkdirSync(propertyUploadDirectory, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensurePropertyUploadDirectory();
    callback(null, propertyUploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = extension || (req.validated?.params?.assetKind === "media" && req.validated?.query?.mediaType === "video" ? ".mp4" : ".jpg");
    const assetKind = req.validated?.params?.assetKind === "cover" ? "cover" : "media";
    const mediaType = req.validated?.query?.mediaType || "image";
    const actorId = req.user?.id || "property";
    const uniqueName = `${actorId}-${assetKind}-${mediaType}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
    callback(null, uniqueName);
  }
});

const fileFilter = (req, file, callback) => {
  const assetKind = req.validated?.params?.assetKind;
  const mediaType = req.validated?.query?.mediaType;

  if (assetKind === "cover") {
    if (!file.mimetype?.startsWith("image/")) {
      callback(new AppError("Property cover must be an image file", StatusCodes.BAD_REQUEST));
      return;
    }

    callback(null, true);
    return;
  }

  if (assetKind === "media") {
    if (!mediaType) {
      callback(new AppError("Media type is required for property media uploads", StatusCodes.BAD_REQUEST));
      return;
    }

    if (!file.mimetype?.startsWith(`${mediaType}/`)) {
      callback(new AppError(`Property media must be a ${mediaType} file`, StatusCodes.BAD_REQUEST));
      return;
    }

    callback(null, true);
    return;
  }

  callback(new AppError("Unsupported property asset kind", StatusCodes.BAD_REQUEST));
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

export const uploadPropertyAsset = (req, res, next) => {
  uploader.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      const assetKind = req.validated?.params?.assetKind;
      next(
        new AppError(
          assetKind === "cover" ? "Property cover image must be 25MB or smaller" : "Property media file must be 25MB or smaller",
          StatusCodes.BAD_REQUEST
        )
      );
      return;
    }

    next(error);
  });
};

export const getPropertyUploadDirectory = () => propertyUploadDirectory;
