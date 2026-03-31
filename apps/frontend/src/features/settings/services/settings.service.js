import { apiClient } from "../../../lib/api/client.js";

export const getMyProfile = async () => {
  const response = await apiClient.get("/users/me");
  return response.data.data;
};

export const updateMyProfile = async (payload) => {
  const response = await apiClient.patch("/users/me/profile", payload);
  return response.data.data;
};

export const changeMyPassword = async (payload) => {
  const response = await apiClient.patch("/users/me/password", payload);
  return response.data.data;
};

export const getAgencyDetail = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}`);
  return response.data.data;
};

export const updateAgencyProfile = async ({ agencyId, payload }) => {
  const response = await apiClient.patch(`/agencies/${agencyId}/profile`, payload);
  return response.data.data;
};

export const deleteAgency = async (agencyId) => {
  const response = await apiClient.delete(`/agencies/${agencyId}`);
  return response.data.data;
};

export const getAgencyRoles = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}/roles`);
  return response.data.data;
};

export const createAgencyRole = async ({ agencyId, payload }) => {
  const response = await apiClient.post(`/agencies/${agencyId}/roles`, payload);
  return response.data.data;
};

export const updateAgencyRole = async ({ agencyId, roleId, payload }) => {
  const response = await apiClient.patch(`/agencies/${agencyId}/roles/${roleId}`, payload);
  return response.data.data;
};

export const duplicateAgencyRole = async ({ agencyId, roleId, payload }) => {
  const response = await apiClient.post(`/agencies/${agencyId}/roles/${roleId}/duplicate`, payload || {});
  return response.data.data;
};

export const deleteAgencyRole = async ({ agencyId, roleId }) => {
  const response = await apiClient.delete(`/agencies/${agencyId}/roles/${roleId}`, { data: {} });
  return response.data.data;
};

export const getAgencyMembers = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}/members`);
  return response.data.data;
};
