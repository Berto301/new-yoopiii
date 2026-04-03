import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env.js";
import { apiLimiter } from "./core/middleware/rate-limit.middleware.js";
import { notFoundHandler } from "./core/middleware/not-found.middleware.js";
import { errorHandler } from "./core/middleware/error.middleware.js";
import { router } from "./router.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const uploadsDirectory = path.resolve(currentDirectory, "../uploads");

export const createApp = () => {
  const app = express();

  fs.mkdirSync(uploadsDirectory, { recursive: true });

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true
    })
  );
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  app.use("/uploads", express.static(uploadsDirectory));
  app.use("/api", apiLimiter);
  app.use("/api/v1", router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
