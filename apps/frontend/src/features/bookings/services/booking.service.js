import { apiClient } from "../../../lib/api/client.js";

export const getBookings = async () => {
  const response = await apiClient.get("/bookings");
  return response.data.data;
};
