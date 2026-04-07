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
  getPropertyPublicationsHandler,
  getNearbyProperties,
  getProperties,
  getPropertiesInBounds,
  getPropertyHistoryHandler,
  patchManagedPropertyHandler,
  patchPropertyWorkflowHandler,
  postManagedPropertyAssetHandler,
  postManagedPropertyHandler,
  postPropertyFavoriteHandler,
  postPropertyReservationHandler,
  postPropertyReservationReleaseHandler,
  postPropertyViewHandler
} from "./properties.controller.js";
import {
  boundedPropertiesSchema,
  createManagedPropertySchema,
  duplicateManagedPropertySchema,
  managedPropertiesSchema,
  nearbyPropertiesSchema,
  propertyAssetUploadSchema,
  propertyCollectionSchema,
  propertyHistoryCreateSchema,
  propertyIdParamsSchema,
  propertyWorkflowSchema,
  updateManagedPropertySchema
} from "./properties.validation.js";
import { uploadPropertyAsset } from "./properties.upload.js";

export const propertyRouter = Router();

propertyRouter.get("/search/nearby", validate(nearbyPropertiesSchema), asyncHandler(getNearbyProperties));
propertyRouter.get("/search/bounds", validate(boundedPropertiesSchema), asyncHandler(getPropertiesInBounds));
propertyRouter.get("/", asyncHandler(getProperties));
propertyRouter.use(asyncHandler(requireAuth));
propertyRouter.get("/publications/feed", validate(propertyCollectionSchema), asyncHandler(getPropertyPublicationsHandler));
propertyRouter.get("/management/mine", validate(managedPropertiesSchema), asyncHandler(getManagedPropertiesHandler));
propertyRouter.post("/management", validate(createManagedPropertySchema), asyncHandler(postManagedPropertyHandler));
propertyRouter.post("/management/assets/:assetKind", validate(propertyAssetUploadSchema), uploadPropertyAsset, asyncHandler(postManagedPropertyAssetHandler));
propertyRouter.patch("/management/:propertyId", validate(updateManagedPropertySchema), asyncHandler(patchManagedPropertyHandler));
propertyRouter.post("/management/:propertyId/duplicate", validate(duplicateManagedPropertySchema), asyncHandler(duplicateManagedPropertyHandler));
propertyRouter.delete("/management/:propertyId", validate(propertyIdParamsSchema), asyncHandler(deleteManagedPropertyHandler));
propertyRouter.get("/favorites/me", validate(propertyCollectionSchema), asyncHandler(getFavoritePropertiesHandler));
propertyRouter.get("/history/me", validate(propertyCollectionSchema), asyncHandler(getPropertyHistoryHandler));
propertyRouter.patch("/:propertyId/workflow", validate(propertyWorkflowSchema), asyncHandler(patchPropertyWorkflowHandler));
propertyRouter.post("/:propertyId/favorite", validate(propertyIdParamsSchema), asyncHandler(postPropertyFavoriteHandler));
propertyRouter.delete("/:propertyId/favorite", validate(propertyIdParamsSchema), asyncHandler(deletePropertyFavoriteHandler));
propertyRouter.post("/:propertyId/reserve", validate(propertyIdParamsSchema), asyncHandler(postPropertyReservationHandler));
propertyRouter.post("/:propertyId/release-reservation", validate(propertyIdParamsSchema), asyncHandler(postPropertyReservationReleaseHandler));
propertyRouter.post("/:propertyId/view", validate(propertyHistoryCreateSchema), asyncHandler(postPropertyViewHandler));
