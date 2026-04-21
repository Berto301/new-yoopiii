import { apiClient } from "../../../lib/api/client.js";

export const getLandingOverview = async () => {
  const response = await apiClient.get("/landing/overview");
  return response.data.data;
};
