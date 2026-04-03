import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const agencyUploadDirectory = path.resolve(currentDirectory, "../../../uploads/agencies");

const ensureAgencyUploadDirectory = () => {
  fs.mkdirSync(agencyUploadDirectory, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureAgencyUploadDirectory();
    callback(null, agencyUploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = extension || ".png";
    const assetKind = req.params.assetKind === "cover" ? "cover" : "logo";
    const uniqueName = `${req.params.agencyId}-${assetKind}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
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
    fileSize: 8 * 1024 * 1024
  }
});

export const uploadAgencyAsset = (req, res, next) => {
  uploader.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Agency image must be 8MB or smaller", StatusCodes.BAD_REQUEST));
      return;
    }

    next(error);
  });
};

export const getAgencyUploadDirectory = () => agencyUploadDirectory;
