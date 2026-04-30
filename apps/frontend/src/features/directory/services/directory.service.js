import { apiClient } from "../../../lib/api/client.js";

export const getAgencyDirectory = async ({ search = "", status = "all", page = 1, limit = 24 } = {}) => {
  const response = await apiClient.get("/agencies/discovery", {
    params: { search, status, page, limit }
  });

  return response.data.data;
};

export const getAgencyDirectoryAgents = async ({ agencyId, search = "", role = "all" }) => {
  const response = await apiClient.get(`/agencies/${agencyId}/discovery/agents`, {
    params: { search, role }
  });

  return response.data.data;
};

export const getDiscoverableAgents = async ({ search = "", agencyType = "all", role = "all", page = 1, limit = 24 } = {}) => {
  const response = await apiClient.get("/users/agents/discovery", {
    params: { search, agencyType, role, page, limit }
  });

  return response.data.data;
};

export const getTopAgents = async ({ limit = 10 } = {}) => {
  const response = await apiClient.get("/users/agents/top", { params: { limit } });
  return response.data.data;
};

export const getAgentScore = async (agentId) => {
  const response = await apiClient.get(`/users/agents/${agentId}/score`);
  return response.data.data;
};

export const recalculateAgentScore = async (agentId) => {
  const response = await apiClient.post(`/users/agents/${agentId}/recalculate-score`);
  return response.data.data;
};

export const rateAgent = async ({ agentId, payload }) => {
  const response = await apiClient.post(`/users/agents/${agentId}/ratings`, payload);
  return response.data.data;
};
