import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { postContactMessageHandler } from "./contact.controller.js";
import { sendContactMessageSchema } from "./contact.validation.js";

export const contactRouter = Router();

contactRouter.post("/", validate(sendContactMessageSchema), asyncHandler(postContactMessageHandler));
