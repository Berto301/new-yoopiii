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

export const getOwnerProperties = async () => {
  const response = await apiClient.get("/owner/properties");
  return response.data.data;
};

export const getOwnerMaintenance = async () => {
  const response = await apiClient.get("/owner/maintenance");
  return response.data.data;
};
