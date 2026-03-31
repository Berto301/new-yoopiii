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

export const updateAgencyProfile = async ({ agencyId, payload }) => {
  const response = await apiClient.patch(`/agencies/${agencyId}/profile`, payload);
  return response.data.data;
};

export const getAgencyRoles = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}/roles`);
  return response.data.data;
};

export const getAgencyMembers = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}/members`);
  return response.data.data;
};
