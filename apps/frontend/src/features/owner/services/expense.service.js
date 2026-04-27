import { apiClient } from "../../../lib/api/client.js";

const cleanFilters = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "all")
  );

export const getOwnerExpenses = async (filters = {}) => {
  const response = await apiClient.get("/expenses", {
    params: cleanFilters(filters)
  });
  return response.data.data;
};

export const createOwnerExpense = async (payload) => {
  const response = await apiClient.post("/expenses", payload);
  return response.data.data;
};

export const updateOwnerExpense = async ({ expenseId, payload }) => {
  const response = await apiClient.put(`/expenses/${expenseId}`, payload);
  return response.data.data;
};

export const deleteOwnerExpense = async (expenseId) => {
  const response = await apiClient.delete(`/expenses/${expenseId}`);
  return response.data.data;
};
