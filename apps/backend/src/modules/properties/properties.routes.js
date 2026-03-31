import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import {
  deleteManagedPropertyHandler,
  deletePropertyFavoriteHandler,
  duplicateManagedPropertyHandler,
  getFavoritePropertiesHandler,
  getManagedPropertiesHandler,
  getNearbyProperties,
  getProperties,
  getPropertiesInBounds,
  getPropertyHistoryHandler,
  patchManagedPropertyHandler,
  patchPropertyWorkflowHandler,
  postManagedPropertyHandler,
  postPropertyFavoriteHandler,
  postPropertyViewHandler
} from "./properties.controller.js";
import {
  boundedPropertiesSchema,
  createManagedPropertySchema,
  duplicateManagedPropertySchema,
  managedPropertiesSchema,
  nearbyPropertiesSchema,
  propertyCollectionSchema,
  propertyHistoryCreateSchema,
  propertyIdParamsSchema,
  propertyWorkflowSchema,
  updateManagedPropertySchema
} from "./properties.validation.js";

export const propertyRouter = Router();

propertyRouter.get("/search/nearby", validate(nearbyPropertiesSchema), asyncHandler(getNearbyProperties));
propertyRouter.get("/search/bounds", validate(boundedPropertiesSchema), asyncHandler(getPropertiesInBounds));
propertyRouter.get("/", asyncHandler(getProperties));
propertyRouter.use(asyncHandler(requireAuth));
propertyRouter.get("/management/mine", validate(managedPropertiesSchema), asyncHandler(getManagedPropertiesHandler));
propertyRouter.post("/management", validate(createManagedPropertySchema), asyncHandler(postManagedPropertyHandler));
propertyRouter.patch("/management/:propertyId", validate(updateManagedPropertySchema), asyncHandler(patchManagedPropertyHandler));
propertyRouter.post("/management/:propertyId/duplicate", validate(duplicateManagedPropertySchema), asyncHandler(duplicateManagedPropertyHandler));
propertyRouter.delete("/management/:propertyId", validate(propertyIdParamsSchema), asyncHandler(deleteManagedPropertyHandler));
propertyRouter.get("/favorites/me", validate(propertyCollectionSchema), asyncHandler(getFavoritePropertiesHandler));
propertyRouter.get("/history/me", validate(propertyCollectionSchema), asyncHandler(getPropertyHistoryHandler));
propertyRouter.patch("/:propertyId/workflow", validate(propertyWorkflowSchema), asyncHandler(patchPropertyWorkflowHandler));
propertyRouter.post("/:propertyId/favorite", validate(propertyIdParamsSchema), asyncHandler(postPropertyFavoriteHandler));
propertyRouter.delete("/:propertyId/favorite", validate(propertyIdParamsSchema), asyncHandler(deletePropertyFavoriteHandler));
propertyRouter.post("/:propertyId/view", validate(propertyHistoryCreateSchema), asyncHandler(postPropertyViewHandler));
