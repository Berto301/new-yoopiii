import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import {
  createUserRentPayment,
  createUserAssetFeedback,
  deleteUserRentPayment,
  getUserAssetDetail,
  getUserRentReceipt,
  listUserAssets,
  payUserRent,
  releaseUserRentedAsset,
  reportUserAssetIssue,
  requestUserAssetSaleContract,
  updateUserRentPayment
} from "./user-assets.service.js";

export const listUserAssetsHandler = async (req, res) => {
  const data = await listUserAssets({ userId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getUserAssetDetailHandler = async (req, res) => {
  const data = await getUserAssetDetail({
    userId: req.user.id,
    assetType: req.validated.params.assetType,
    assetId: req.validated.params.assetId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const releaseUserRentedAssetHandler = async (req, res) => {
  if (req.validated.params.assetType !== "rented") {
    throw new AppError("Seuls les biens loues peuvent etre liberes", StatusCodes.BAD_REQUEST);
  }

  const data = await releaseUserRentedAsset({
    userId: req.user.id,
    assetId: req.validated.params.assetId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const payUserRentHandler = async (req, res) => {
  const data = await payUserRent({
    userId: req.user.id,
    assetId: req.validated.params.assetId,
    paymentId: req.validated.params.paymentId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const createUserRentPaymentHandler = async (req, res) => {
  if (req.validated.params.assetType !== "rented") {
    throw new AppError("Seuls les biens loues acceptent des paiements", StatusCodes.BAD_REQUEST);
  }

  const data = await createUserRentPayment({
    userId: req.user.id,
    assetId: req.validated.params.assetId,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const updateUserRentPaymentHandler = async (req, res) => {
  if (req.validated.params.assetType !== "rented") {
    throw new AppError("Seuls les biens loues acceptent des paiements", StatusCodes.BAD_REQUEST);
  }

  const data = await updateUserRentPayment({
    userId: req.user.id,
    assetId: req.validated.params.assetId,
    paymentId: req.validated.params.paymentId,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteUserRentPaymentHandler = async (req, res) => {
  if (req.validated.params.assetType !== "rented") {
    throw new AppError("Seuls les biens loues acceptent des paiements", StatusCodes.BAD_REQUEST);
  }

  const data = await deleteUserRentPayment({
    userId: req.user.id,
    assetId: req.validated.params.assetId,
    paymentId: req.validated.params.paymentId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getUserRentReceiptHandler = async (req, res) => {
  const data = await getUserRentReceipt({
    userId: req.user.id,
    assetId: req.validated.params.assetId,
    paymentId: req.validated.params.paymentId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const reportUserAssetIssueHandler = async (req, res) => {
  const data = await reportUserAssetIssue({
    userId: req.user.id,
    assetType: req.validated.params.assetType,
    assetId: req.validated.params.assetId,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const createUserAssetFeedbackHandler = async (req, res) => {
  const data = await createUserAssetFeedback({
    userId: req.user.id,
    assetType: req.validated.params.assetType,
    assetId: req.validated.params.assetId,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const requestUserAssetSaleContractHandler = async (req, res) => {
  if (req.validated.params.assetType !== "purchased") {
    throw new AppError("Seuls les biens achetes peuvent etre remis en vente", StatusCodes.BAD_REQUEST);
  }

  const data = await requestUserAssetSaleContract({
    userId: req.user.id,
    assetId: req.validated.params.assetId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};
