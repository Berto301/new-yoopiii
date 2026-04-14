import { StatusCodes } from "http-status-codes";
import {
  createManagementContract,
  deleteManagementContract,
  getActiveManagementContractsForActor,
  listAvailableContractAgents,
  listAvailableContractProperties,
  getManagementContractById,
  listManagementContracts,
  listManagerOwners,
  updateManagementContract,
  uploadManagementContractDocument
} from "./contracts.service.js";

export const getContractsHandler = async (req, res) => {
  const data = await listManagementContracts({ actor: req.user, status: req.validated.query.status });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getContractDetailHandler = async (req, res) => {
  const data = await getManagementContractById({ contractId: req.validated.params.contractId, actor: req.user });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postContractHandler = async (req, res) => {
  const data = await createManagementContract({ actor: req.user, payload: req.validated.body });
  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const patchContractHandler = async (req, res) => {
  const data = await updateManagementContract({
    contractId: req.validated.params.contractId,
    actor: req.user,
    payload: req.validated.body
  });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteContractHandler = async (req, res) => {
  const data = await deleteManagementContract({ contractId: req.validated.params.contractId, actor: req.user });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postContractUploadHandler = async (req, res) => {
  const data = await uploadManagementContractDocument({
    actor: req.user,
    contractId: req.validated.query.contractId || null,
    kind: req.validated.query.kind,
    file: req.file
  });
  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const getContractOwnersHandler = async (_req, res) => {
  const data = await listManagerOwners();
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getActiveContractsHandler = async (req, res) => {
  const data = await getActiveManagementContractsForActor(req.user);
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getContractPropertyOptionsHandler = async (req, res) => {
  const data = await listAvailableContractProperties(req.user);
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getContractAgentOptionsHandler = async (req, res) => {
  const data = await listAvailableContractAgents(req.user);
  res.status(StatusCodes.OK).json({ success: true, data });
};
