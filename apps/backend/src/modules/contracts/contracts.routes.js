import { Router } from "express";
import { authorizeRoles, requireAuth } from "../../core/middleware/auth.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import {
  contractCollectionSchema,
  contractIdParamsSchema,
  contractRelatedOptionsSchema,
  contractOwnerOptionsSchema,
  contractUploadSchema,
  createContractSchema,
  updateContractSchema
} from "./contracts.validation.js";
import {
  deleteContractHandler,
  getContractAgentOptionsHandler,
  getActiveContractsHandler,
  getContractDetailHandler,
  getContractOwnersHandler,
  getContractPropertyOptionsHandler,
  getContractsHandler,
  patchContractHandler,
  postContractHandler,
  postContractUploadHandler
} from "./contracts.controller.js";
import { uploadContractDocument } from "./contracts.upload.js";

export const contractRouter = Router();

contractRouter.use(asyncHandler(requireAuth));
contractRouter.use(asyncHandler(authorizeRoles("agency", "agency_agent", "independent_agent", "proprietaire")));

contractRouter.get("/", validate(contractCollectionSchema), asyncHandler(getContractsHandler));
contractRouter.get("/owners/options", validate(contractOwnerOptionsSchema), asyncHandler(getContractOwnersHandler));
contractRouter.get("/properties/options", validate(contractRelatedOptionsSchema), asyncHandler(getContractPropertyOptionsHandler));
contractRouter.get("/agents/options", validate(contractRelatedOptionsSchema), asyncHandler(getContractAgentOptionsHandler));
contractRouter.get("/active", validate(contractCollectionSchema), asyncHandler(getActiveContractsHandler));
contractRouter.get("/:contractId", validate(contractIdParamsSchema), asyncHandler(getContractDetailHandler));
contractRouter.post("/", validate(createContractSchema), asyncHandler(postContractHandler));
contractRouter.patch("/:contractId", validate(updateContractSchema), asyncHandler(patchContractHandler));
contractRouter.delete("/:contractId", validate(contractIdParamsSchema), asyncHandler(deleteContractHandler));
contractRouter.post("/uploads/documents", validate(contractUploadSchema), uploadContractDocument, asyncHandler(postContractUploadHandler));
