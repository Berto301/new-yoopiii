import { apiClient } from "../../../lib/api/client.js";

export const getUserAssets = async () => {
  const response = await apiClient.get("/user-assets/properties");
  return response.data.data;
};

export const getUserAssetDetail = async ({ assetType, assetId }) => {
  const response = await apiClient.get(`/user-assets/properties/${assetType}/${assetId}`);
  return response.data.data;
};

export const releaseUserAsset = async ({ assetType, assetId }) => {
  const response = await apiClient.post(`/user-assets/properties/${assetType}/${assetId}/release`);
  return response.data.data;
};

export const payUserRent = async ({ assetType, assetId, paymentId }) => {
  const response = await apiClient.post(`/user-assets/properties/${assetType}/${assetId}/payments/${paymentId}/pay`);
  return response.data.data;
};

export const createUserRentPayment = async ({ assetType, assetId, payload }) => {
  const response = await apiClient.post(`/user-assets/properties/${assetType}/${assetId}/payments`, payload);
  return response.data.data;
};

export const updateUserRentPayment = async ({ assetType, assetId, paymentId, payload }) => {
  const response = await apiClient.patch(`/user-assets/properties/${assetType}/${assetId}/payments/${paymentId}`, payload);
  return response.data.data;
};

export const deleteUserRentPayment = async ({ assetType, assetId, paymentId }) => {
  const response = await apiClient.delete(`/user-assets/properties/${assetType}/${assetId}/payments/${paymentId}`);
  return response.data.data;
};

export const getUserRentReceipt = async ({ assetType, assetId, paymentId }) => {
  const response = await apiClient.get(`/user-assets/properties/${assetType}/${assetId}/payments/${paymentId}/receipt`);
  return response.data.data;
};

export const reportUserAssetIssue = async ({ assetType, assetId, payload }) => {
  const response = await apiClient.post(`/user-assets/properties/${assetType}/${assetId}/issues`, payload);
  return response.data.data;
};

export const createUserAssetFeedback = async ({ assetType, assetId, payload }) => {
  const response = await apiClient.post(`/user-assets/properties/${assetType}/${assetId}/feedbacks`, payload);
  return response.data.data;
};

export const requestUserAssetSaleContract = async ({ assetId }) => {
  const response = await apiClient.post(`/user-assets/properties/purchased/${assetId}/sale-request`);
  return response.data.data;
};
