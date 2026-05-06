import { Router } from "express";
import { authorizeRoles, requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  createUserAssetFeedbackHandler,
  getUserAssetDetailHandler,
  getUserRentReceiptHandler,
  listUserAssetsHandler,
  payUserRentHandler,
  releaseUserRentedAssetHandler,
  reportUserAssetIssueHandler,
  requestUserAssetSaleContractHandler
} from "./user-assets.controller.js";
import {
  userAssetFeedbackSchema,
  userAssetIssueSchema,
  userAssetParamsSchema,
  userAssetPaymentParamsSchema
} from "./user-assets.validation.js";

export const userAssetRouter = Router();

userAssetRouter.use(asyncHandler(requireAuth));
userAssetRouter.use(asyncHandler(authorizeRoles("user")));

userAssetRouter.get("/properties", asyncHandler(listUserAssetsHandler));
userAssetRouter.get("/properties/:assetType/:assetId", validate(userAssetParamsSchema), asyncHandler(getUserAssetDetailHandler));
userAssetRouter.post("/properties/:assetType/:assetId/release", validate(userAssetParamsSchema), asyncHandler(releaseUserRentedAssetHandler));
userAssetRouter.post("/properties/:assetType/:assetId/issues", validate(userAssetIssueSchema), asyncHandler(reportUserAssetIssueHandler));
userAssetRouter.post("/properties/:assetType/:assetId/feedbacks", validate(userAssetFeedbackSchema), asyncHandler(createUserAssetFeedbackHandler));
userAssetRouter.post("/properties/:assetType/:assetId/sale-request", validate(userAssetParamsSchema), asyncHandler(requestUserAssetSaleContractHandler));
userAssetRouter.post("/properties/:assetType/:assetId/payments/:paymentId/pay", validate(userAssetPaymentParamsSchema), asyncHandler(payUserRentHandler));
userAssetRouter.get("/properties/:assetType/:assetId/payments/:paymentId/receipt", validate(userAssetPaymentParamsSchema), asyncHandler(getUserRentReceiptHandler));
