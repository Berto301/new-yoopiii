import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const contractUploadDirectory = path.resolve(currentDirectory, "../../../uploads/contracts");

const ensureContractUploadDirectory = () => {
  fs.mkdirSync(contractUploadDirectory, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureContractUploadDirectory();
    callback(null, contractUploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".bin";
    const actorId = req.user?.id || "contract";
    const kind = req.validated?.query?.kind || "document";
    callback(null, `${actorId}-${kind}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const uploader = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

export const uploadContractDocument = (req, res, next) => {
  uploader.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Le document du contrat doit faire 25MB ou moins", StatusCodes.BAD_REQUEST));
      return;
    }

    next(error);
  });
};
