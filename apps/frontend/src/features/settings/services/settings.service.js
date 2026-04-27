import { apiClient } from "../../../lib/api/client.js";

export const getMyProfile = async () => {
  const response = await apiClient.get("/users/me");
  return response.data.data;
};

export const getUsers = async () => {
  const response = await apiClient.get("/users");
  return response.data.data;
};

export const getUserById = async (userId) => {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data.data;
};

export const updateMyProfile = async (payload) => {
  const response = await apiClient.patch("/users/me/profile", payload);
  return response.data.data;
};

export const updateMyPreferences = async (payload) => {
  const response = await apiClient.patch("/users/me/preferences", payload);
  return response.data.data;
};

export const uploadMyAvatar = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/users/me/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data.data;
};

export const changeMyPassword = async (payload) => {
  const response = await apiClient.patch("/users/me/password", payload);
  return response.data.data;
};

export const linkSocialProvider = async (payload) => {
  const response = await apiClient.post("/auth/link-provider", payload);
  return response.data.data;
};

export const unlinkSocialProvider = async (provider) => {
  const response = await apiClient.delete(`/auth/link-provider/${provider}`);
  return response.data.data;
};

export const enableTwoFactor = async (payload = {}) => {
  const response = await apiClient.post("/auth/2fa/enable", payload);
  return response.data.data;
};

export const verifyTwoFactor = async (payload) => {
  const response = await apiClient.post("/auth/2fa/verify", payload);
  return response.data.data;
};

export const disableTwoFactor = async (payload = {}) => {
  const response = await apiClient.post("/auth/2fa/disable", payload);
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

export const uploadAgencyAsset = async ({ agencyId, assetKind, file }) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post(`/agencies/${agencyId}/assets/${assetKind}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

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

export const createAgencyMember = async ({ agencyId, payload }) => {
  const response = await apiClient.post(`/agencies/${agencyId}/members`, payload);
  return response.data.data;
};

export const updateAgencyMember = async ({ agencyId, memberId, payload }) => {
  const response = await apiClient.patch(`/agencies/${agencyId}/members/${memberId}`, payload);
  return response.data.data;
};

export const deleteAgencyMember = async ({ agencyId, memberId }) => {
  const response = await apiClient.delete(`/agencies/${agencyId}/members/${memberId}`, { data: {} });
  return response.data.data;
};
