import dayjs from "dayjs";
import { apiClient } from "../../../lib/api/client.js";

export const getAgencyDashboardSummary = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}/dashboard/summary`);
  return response.data.data;
};

export const getAgencyMembers = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}/members`);
  return response.data.data;
};

export const getAgencyExpenses = async (agencyId) => {
  const response = await apiClient.get(`/agencies/${agencyId}/expenses`);
  return response.data.data;
};

export const getAgencyCalendarEvents = async (agencyId) => {
  const startAt = dayjs().startOf("month").toISOString();
  const endAt = dayjs().endOf("month").toISOString();
  const response = await apiClient.get(`/agencies/${agencyId}/calendar/events`, {
    params: { startAt, endAt, page: 1, limit: 20 }
  });
  return response.data.data;
};
