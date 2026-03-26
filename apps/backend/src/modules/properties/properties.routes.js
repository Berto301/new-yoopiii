import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { getNearbyProperties, getProperties } from "./properties.controller.js";
import { nearbyPropertiesSchema } from "./properties.validation.js";

export const propertyRouter = Router();

propertyRouter.get("/search/nearby", validate(nearbyPropertiesSchema), asyncHandler(getNearbyProperties));
propertyRouter.get("/", asyncHandler(getProperties));
