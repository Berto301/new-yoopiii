import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const profileUploadDirectory = path.resolve(currentDirectory, "../../../uploads/profile");

const ensureProfileUploadDirectory = () => {
  fs.mkdirSync(profileUploadDirectory, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureProfileUploadDirectory();
    callback(null, profileUploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = extension || ".png";
    const uniqueName = `${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
    callback(null, uniqueName);
  }
});

const fileFilter = (_req, file, callback) => {
  if (!file.mimetype?.startsWith("image/")) {
    callback(new AppError("Only image files are allowed", StatusCodes.BAD_REQUEST));
    return;
  }

  callback(null, true);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const uploadProfileAvatar = (req, res, next) => {
  uploader.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Profile image must be 5MB or smaller", StatusCodes.BAD_REQUEST));
      return;
    }

    next(error);
  });
};

export const getProfileUploadDirectory = () => profileUploadDirectory;

