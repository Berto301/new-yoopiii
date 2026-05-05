import { Router } from "express";
import { requireAuth, authorizeRoles } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { getCrmMetadataHandler, patchCrmPipelineHandler } from "./crm.controller.js";
import { listCrmMetadataSchema, updateCrmPipelineSchema } from "./crm.validation.js";

export const crmRouter = Router();

crmRouter.use(asyncHandler(requireAuth));
crmRouter.use(asyncHandler(authorizeRoles("agency", "agency_agent", "independent_agent")));
crmRouter.get("/metadata", validate(listCrmMetadataSchema), asyncHandler(getCrmMetadataHandler));
crmRouter.patch("/metadata/:metadataId/pipeline", validate(updateCrmPipelineSchema), asyncHandler(patchCrmPipelineHandler));
