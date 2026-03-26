import { apiClient } from "../../../lib/api/client.js";

export const loginRequest = async (payload) => {
  const response = await apiClient.post("/auth/login", payload);
  return response.data.data;
};

export const registerRequest = async (payload) => {
  const response = await apiClient.post("/auth/register", payload);
  return response.data.data;
};
