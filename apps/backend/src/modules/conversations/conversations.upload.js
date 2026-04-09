import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const conversationUploadDirectory = path.resolve(currentDirectory, "../../../uploads/conversations");

const ensureConversationUploadDirectory = () => {
  fs.mkdirSync(conversationUploadDirectory, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureConversationUploadDirectory();
    callback(null, conversationUploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".bin";
    const actorId = req.user?.id || "conversation";
    callback(null, `${actorId}-attachment-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const uploader = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10
  }
});

export const uploadConversationAttachments = (req, res, next) => {
  uploader.array("files", 10)(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError("Chaque piece jointe doit faire 25MB ou moins", StatusCodes.BAD_REQUEST));
      return;
    }

    next(error);
  });
};

export const getConversationUploadDirectory = () => conversationUploadDirectory;
