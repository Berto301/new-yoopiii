import { apiClient } from "../../../lib/api/client.js";

export const getOwnerDashboard = async () => {
  const response = await apiClient.get("/owner/dashboard");
  return response.data.data;
};

export const getOwnerContracts = async () => {
  const response = await apiClient.get("/owner/contracts");
  return response.data.data;
};

export const getOwnerRents = async () => {
  const response = await apiClient.get("/owner/rents");
  return response.data.data;
};

export const getOwnerTenantsManagement = async (params = {}) => {
  const response = await apiClient.get("/owner/tenants-management", { params });
  return response.data.data;
};

export const createOwnerRentPayment = async (payload) => {
  const response = await apiClient.post("/owner/rents", payload);
  return response.data.data;
};

export const updateOwnerRentPayment = async ({ paymentId, payload }) => {
  const response = await apiClient.patch(`/owner/rents/${paymentId}`, payload);
  return response.data.data;
};

export const deleteOwnerRentPayment = async (paymentId) => {
  const response = await apiClient.delete(`/owner/rents/${paymentId}`);
  return response.data.data;
};

export const approveOwnerRentPayment = async (paymentId) => {
  const response = await apiClient.post(`/owner/rents/${paymentId}/approve`);
  return response.data.data;
};

export const getOwnerTenants = async () => {
  const response = await apiClient.get("/owner/tenants");
  return response.data.data;
};

export const createOwnerTenant = async (payload) => {
  const response = await apiClient.post("/owner/tenants", payload);
  return response.data.data;
};

export const updateOwnerTenant = async ({ tenantId, payload }) => {
  const response = await apiClient.patch(`/owner/tenants/${tenantId}`, payload);
  return response.data.data;
};

export const deleteOwnerTenant = async (tenantId) => {
  const response = await apiClient.delete(`/owner/tenants/${tenantId}`);
  return response.data.data;
};

export const getUserById = async (userId) => {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data.data;
};

export const getOwnerProperties = async () => {
  const response = await apiClient.get("/owner/properties");
  return response.data.data;
};

export const getOwnerPropertyTenancy = async (propertyId) => {
  const response = await apiClient.get(`/owner/properties/${propertyId}/tenancy`);
  return response.data.data;
};

export const generateOwnerPropertyReceipt = async ({ propertyId, paymentId }) => {
  const response = await apiClient.post(`/owner/properties/${propertyId}/receipts/${paymentId}/generate`);
  return response.data.data;
};

export const markOwnerPropertyFeedbackHandled = async ({ propertyId, feedbackId }) => {
  const response = await apiClient.patch(`/owner/properties/${propertyId}/feedbacks/${feedbackId}/handled`);
  return response.data.data;
};

export const getOwnerMaintenance = async () => {
  const response = await apiClient.get("/owner/maintenance");
  return response.data.data;
};

export const createOwnerMaintenanceTicket = async (payload) => {
  const response = await apiClient.post("/owner/maintenance", payload);
  return response.data.data;
};

export const updateOwnerMaintenanceTicket = async ({ ticketId, payload }) => {
  const response = await apiClient.patch(`/owner/maintenance/${ticketId}`, payload);
  return response.data.data;
};

export const deleteOwnerMaintenanceTicket = async (ticketId) => {
  const response = await apiClient.delete(`/owner/maintenance/${ticketId}`);
  return response.data.data;
};
