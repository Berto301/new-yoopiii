import { Router } from "express";
import { authorizeRoles, requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  approveOwnerRentPaymentHandler,
  createOwnerRentPaymentHandler,
  createOwnerTenantHandler,
  createOwnerMaintenanceHandler,
  deleteOwnerRentPaymentHandler,
  deleteOwnerTenantHandler,
  deleteOwnerMaintenanceHandler,
  getOwnerContractsHandler,
  getOwnerDashboardHandler,
  getOwnerMaintenanceHandler,
  getOwnerPropertyTenantWorkspaceHandler,
  getOwnerPropertiesHandler,
  getOwnerRentsHandler,
  getOwnerTenantsManagementHandler,
  getOwnerTenantsHandler,
  generateOwnerPropertyReceiptHandler,
  markOwnerPropertyFeedbackHandledHandler,
  updateOwnerRentPaymentHandler,
  updateOwnerTenantHandler,
  updateOwnerMaintenanceHandler
} from "./owner.controller.js";
import {
  createOwnerRentPaymentSchema,
  createOwnerTenantSchema,
  createOwnerMaintenanceTicketSchema,
  maintenanceTicketParamsSchema,
  ownerPropertyFeedbackParamsSchema,
  ownerPropertyParamsSchema,
  ownerPropertyPaymentParamsSchema,
  ownerRentPaymentParamsSchema,
  ownerTenantParamsSchema,
  updateOwnerRentPaymentSchema,
  updateOwnerTenantSchema,
  updateOwnerMaintenanceTicketSchema
} from "./owner.validation.js";

export const ownerRouter = Router();

ownerRouter.use(asyncHandler(requireAuth));
ownerRouter.use(asyncHandler(authorizeRoles("proprietaire")));

ownerRouter.get("/dashboard", asyncHandler(getOwnerDashboardHandler));
ownerRouter.get("/contracts", asyncHandler(getOwnerContractsHandler));
ownerRouter.get("/rents", asyncHandler(getOwnerRentsHandler));
ownerRouter.post("/rents", validate(createOwnerRentPaymentSchema), asyncHandler(createOwnerRentPaymentHandler));
ownerRouter.patch("/rents/:paymentId", validate(updateOwnerRentPaymentSchema), asyncHandler(updateOwnerRentPaymentHandler));
ownerRouter.delete("/rents/:paymentId", validate(ownerRentPaymentParamsSchema), asyncHandler(deleteOwnerRentPaymentHandler));
ownerRouter.post("/rents/:paymentId/approve", validate(ownerRentPaymentParamsSchema), asyncHandler(approveOwnerRentPaymentHandler));
ownerRouter.get("/tenants", asyncHandler(getOwnerTenantsHandler));
ownerRouter.get("/tenants-management", asyncHandler(getOwnerTenantsManagementHandler));
ownerRouter.post("/tenants", validate(createOwnerTenantSchema), asyncHandler(createOwnerTenantHandler));
ownerRouter.patch("/tenants/:tenantId", validate(updateOwnerTenantSchema), asyncHandler(updateOwnerTenantHandler));
ownerRouter.delete("/tenants/:tenantId", validate(ownerTenantParamsSchema), asyncHandler(deleteOwnerTenantHandler));
ownerRouter.get("/properties", asyncHandler(getOwnerPropertiesHandler));
ownerRouter.get("/properties/:propertyId/tenancy", validate(ownerPropertyParamsSchema), asyncHandler(getOwnerPropertyTenantWorkspaceHandler));
ownerRouter.post("/properties/:propertyId/receipts/:paymentId/generate", validate(ownerPropertyPaymentParamsSchema), asyncHandler(generateOwnerPropertyReceiptHandler));
ownerRouter.patch("/properties/:propertyId/feedbacks/:feedbackId/handled", validate(ownerPropertyFeedbackParamsSchema), asyncHandler(markOwnerPropertyFeedbackHandledHandler));
ownerRouter.get("/maintenance", asyncHandler(getOwnerMaintenanceHandler));
ownerRouter.post("/maintenance", validate(createOwnerMaintenanceTicketSchema), asyncHandler(createOwnerMaintenanceHandler));
ownerRouter.patch("/maintenance/:ticketId", validate(updateOwnerMaintenanceTicketSchema), asyncHandler(updateOwnerMaintenanceHandler));
ownerRouter.delete("/maintenance/:ticketId", validate(maintenanceTicketParamsSchema), asyncHandler(deleteOwnerMaintenanceHandler));
