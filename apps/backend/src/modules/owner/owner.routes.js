import { Router } from "express";
import { authorizeRoles, requireAuth } from "../../core/middleware/auth.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  getOwnerContractsHandler,
  getOwnerDashboardHandler,
  getOwnerMaintenanceHandler,
  getOwnerPropertiesHandler,
  getOwnerRentsHandler,
  getOwnerTenantsHandler
} from "./owner.controller.js";

export const ownerRouter = Router();

ownerRouter.use(asyncHandler(requireAuth));
ownerRouter.use(asyncHandler(authorizeRoles("proprietaire")));

ownerRouter.get("/dashboard", asyncHandler(getOwnerDashboardHandler));
ownerRouter.get("/contracts", asyncHandler(getOwnerContractsHandler));
ownerRouter.get("/rents", asyncHandler(getOwnerRentsHandler));
ownerRouter.get("/tenants", asyncHandler(getOwnerTenantsHandler));
ownerRouter.get("/properties", asyncHandler(getOwnerPropertiesHandler));
ownerRouter.get("/maintenance", asyncHandler(getOwnerMaintenanceHandler));
