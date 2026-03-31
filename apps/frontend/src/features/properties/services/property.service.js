import { apiClient } from "../../../lib/api/client.js";

export const getManagedProperties = async (params = {}) => {
  const response = await apiClient.get("/properties/management/mine", { params });
  return response.data.data;
};

export const createManagedProperty = async (payload) => {
  const response = await apiClient.post("/properties/management", payload);
  return response.data.data;
};

export const updateManagedProperty = async ({ propertyId, payload }) => {
  const response = await apiClient.patch(`/properties/management/${propertyId}`, payload);
  return response.data.data;
};

export const duplicateManagedProperty = async ({ propertyId, payload = {} }) => {
  const response = await apiClient.post(`/properties/management/${propertyId}/duplicate`, payload);
  return response.data.data;
};

export const deleteManagedProperty = async (propertyId) => {
  const response = await apiClient.delete(`/properties/management/${propertyId}`);
  return response.data.data;
};

export const getFavoriteProperties = async (params = {}) => {
  const response = await apiClient.get("/properties/favorites/me", { params });
  return response.data.data;
};

export const getPropertyHistory = async (params = {}) => {
  const response = await apiClient.get("/properties/history/me", { params });
  return response.data.data;
};

export const addPropertyToFavorites = async (propertyId) => {
  const response = await apiClient.post(`/properties/${propertyId}/favorite`);
  return response.data.data;
};

export const removePropertyFromFavorites = async (propertyId) => {
  const response = await apiClient.delete(`/properties/${propertyId}/favorite`);
  return response.data.data;
};

export const updatePropertyWorkflow = async ({ propertyId, payload }) => {
  const response = await apiClient.patch(`/properties/${propertyId}/workflow`, payload);
  return response.data.data;
};
