import { StatusCodes } from "http-status-codes";
import { listCrmMetadata, updateCrmPipelineStage } from "./crm.service.js";

export const getCrmMetadataHandler = async (req, res) => {
  const data = await listCrmMetadata({ actor: req.user, filters: req.validated.query });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const patchCrmPipelineHandler = async (req, res) => {
  const data = await updateCrmPipelineStage({
    actor: req.user,
    metadataId: req.validated.params.metadataId,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};
