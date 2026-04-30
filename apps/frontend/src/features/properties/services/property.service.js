import { apiClient } from "../../../lib/api/client.js";

export const getManagedProperties = async (params = {}) => {
  const response = await apiClient.get("/properties/management/mine", { params });
  return response.data.data;
};

export const createManagedProperty = async (payload) => {
  const response = await apiClient.post("/properties/management", payload);
  return response.data.data;
};

export const uploadPropertyAsset = async ({ assetKind, file, mediaType }) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post(`/properties/management/assets/${assetKind}`, formData, {
    params: mediaType ? { mediaType } : undefined,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

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

export const getPropertyPublications = async (params = {}) => {
  const response = await apiClient.get("/properties/publications/feed", { params });
  return response.data.data;
};

export const getPublicPropertyDetail = async (identifier) => {
  const response = await apiClient.get(`/properties/public/${encodeURIComponent(identifier)}`);
  return response.data.data;
};

export const getManagedPropertyDetail = async (identifier) => {
  const response = await apiClient.get(`/properties/management/view/${encodeURIComponent(identifier)}`);
  return response.data.data;
};

export const getPropertyThreeDDetail = async (identifier) => {
  try {
    return await getManagedPropertyDetail(identifier);
  } catch (error) {
    const statusCode = error?.response?.status;

    if (![401, 403, 404].includes(statusCode)) {
      throw error;
    }
  }

  return getPublicPropertyDetail(identifier);
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

export const reserveProperty = async (propertyId) => {
  const response = await apiClient.post(`/properties/${propertyId}/reserve`);
  return response.data.data;
};

export const releasePropertyReservation = async (propertyId) => {
  const response = await apiClient.post(`/properties/${propertyId}/release-reservation`);
  return response.data.data;
};

export const updatePropertyWorkflow = async ({ propertyId, payload }) => {
  const response = await apiClient.patch(`/properties/${propertyId}/workflow`, payload);
  return response.data.data;
};

export const getPropertyScore = async (propertyId) => {
  const response = await apiClient.get(`/properties/${propertyId}/score`);
  return response.data.data;
};

export const recalculatePropertyScore = async (propertyId) => {
  const response = await apiClient.post(`/properties/${propertyId}/recalculate-score`);
  return response.data.data;
};

export const recalculatePropertyScores = async () => {
  const response = await apiClient.post("/properties/recalculate-scores");
  return response.data.data;
};
