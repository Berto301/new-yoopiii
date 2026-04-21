import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { getLandingOverviewHandler } from "./landing.controller.js";

export const landingRouter = Router();

landingRouter.get("/overview", asyncHandler(getLandingOverviewHandler));
