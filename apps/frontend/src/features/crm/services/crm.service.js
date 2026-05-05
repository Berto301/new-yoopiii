import { apiClient } from "../../../lib/api/client.js";

export const getCrmMetadata = async (params = {}) => {
  const response = await apiClient.get("/crm/metadata", { params });
  return response.data.data;
};

export const updateCrmPipelineStage = async ({ metadataId, payload }) => {
  const response = await apiClient.patch(`/crm/metadata/${metadataId}/pipeline`, payload);
  return response.data.data;
};
