import { apiClient } from "../../lib/api/client.js";

export const getContracts = async (params = {}) => {
  const response = await apiClient.get("/contracts", { params });
  return response.data.data;
};

export const getContractOwners = async () => {
  const response = await apiClient.get("/contracts/owners/options");
  return response.data.data;
};

export const getContractProperties = async () => {
  const response = await apiClient.get("/contracts/properties/options");
  return response.data.data;
};

export const getContractAgents = async () => {
  const response = await apiClient.get("/contracts/agents/options");
  return response.data.data;
};

export const getActiveContracts = async () => {
  const response = await apiClient.get("/contracts/active");
  return response.data.data;
};

export const createContract = async (payload) => {
  const response = await apiClient.post("/contracts", payload);
  return response.data.data;
};

export const updateContract = async ({ contractId, payload }) => {
  const response = await apiClient.patch(`/contracts/${contractId}`, payload);
  return response.data.data;
};

export const deleteContract = async (contractId) => {
  const response = await apiClient.delete(`/contracts/${contractId}`);
  return response.data.data;
};

export const uploadContractDocument = async ({ kind, contractId, file }) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/contracts/uploads/documents", formData, {
    params: {
      kind,
      ...(contractId ? { contractId } : {})
    },
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data.data;
};
