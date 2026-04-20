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

export const getUserById = async (userId) => {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data.data;
};

export const getOwnerProperties = async () => {
  const response = await apiClient.get("/owner/properties");
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
