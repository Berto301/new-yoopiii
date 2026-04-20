import { Router } from "express";
import { authorizeRoles, requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  createOwnerTenantHandler,
  createOwnerMaintenanceHandler,
  deleteOwnerMaintenanceHandler,
  getOwnerContractsHandler,
  getOwnerDashboardHandler,
  getOwnerMaintenanceHandler,
  getOwnerPropertiesHandler,
  getOwnerRentsHandler,
  getOwnerTenantsHandler,
  updateOwnerTenantHandler,
  updateOwnerMaintenanceHandler
} from "./owner.controller.js";
import {
  createOwnerTenantSchema,
  createOwnerMaintenanceTicketSchema,
  maintenanceTicketParamsSchema,
  updateOwnerTenantSchema,
  updateOwnerMaintenanceTicketSchema
} from "./owner.validation.js";

export const ownerRouter = Router();

ownerRouter.use(asyncHandler(requireAuth));
ownerRouter.use(asyncHandler(authorizeRoles("proprietaire")));

ownerRouter.get("/dashboard", asyncHandler(getOwnerDashboardHandler));
ownerRouter.get("/contracts", asyncHandler(getOwnerContractsHandler));
ownerRouter.get("/rents", asyncHandler(getOwnerRentsHandler));
ownerRouter.get("/tenants", asyncHandler(getOwnerTenantsHandler));
ownerRouter.post("/tenants", validate(createOwnerTenantSchema), asyncHandler(createOwnerTenantHandler));
ownerRouter.patch("/tenants/:tenantId", validate(updateOwnerTenantSchema), asyncHandler(updateOwnerTenantHandler));
ownerRouter.get("/properties", asyncHandler(getOwnerPropertiesHandler));
ownerRouter.get("/maintenance", asyncHandler(getOwnerMaintenanceHandler));
ownerRouter.post("/maintenance", validate(createOwnerMaintenanceTicketSchema), asyncHandler(createOwnerMaintenanceHandler));
ownerRouter.patch("/maintenance/:ticketId", validate(updateOwnerMaintenanceTicketSchema), asyncHandler(updateOwnerMaintenanceHandler));
ownerRouter.delete("/maintenance/:ticketId", validate(maintenanceTicketParamsSchema), asyncHandler(deleteOwnerMaintenanceHandler));
