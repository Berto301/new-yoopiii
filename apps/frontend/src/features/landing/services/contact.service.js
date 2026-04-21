import { apiClient } from "../../../lib/api/client.js";

export const sendContactMessage = async (payload) => {
  const response = await apiClient.post("/contact", payload);
  return response.data.data;
};
