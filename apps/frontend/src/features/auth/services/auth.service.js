import { apiClient } from "../../../lib/api/client.js";

export const loginRequest = async (payload) => {
  const response = await apiClient.post("/auth/login", payload);
  return response.data.data;
};

export const registerRequest = async (payload) => {
  const response = await apiClient.post("/auth/register", payload);
  return response.data.data;
};

export const socialLoginRequest = async ({ provider, payload }) => {
  const response = await apiClient.post(`/auth/${provider}`, payload);
  return response.data.data;
};

export const linkProviderRequest = async (payload) => {
  const response = await apiClient.post("/auth/link-provider", payload);
  return response.data.data;
};

export const unlinkProviderRequest = async (provider) => {
  const response = await apiClient.delete(`/auth/link-provider/${provider}`);
  return response.data.data;
};

export const enableTwoFactorRequest = async (payload = {}) => {
  const response = await apiClient.post("/auth/2fa/enable", payload);
  return response.data.data;
};

export const verifyTwoFactorRequest = async (payload) => {
  const response = await apiClient.post("/auth/2fa/verify", payload);
  return response.data.data;
};

export const disableTwoFactorRequest = async (payload = {}) => {
  const response = await apiClient.post("/auth/2fa/disable", payload);
  return response.data.data;
};
