import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getManagedProperties } from "../../properties/services/property.service.js";
import {
  createOwnerExpense,
  deleteOwnerExpense,
  getOwnerExpenses,
  updateOwnerExpense
} from "../services/expense.service.js";

export const useOwnerExpensesWorkspace = (filters) => {
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ["owner-expenses", filters],
    queryFn: () => getOwnerExpenses(filters)
  });

  const managedPropertiesQuery = useQuery({
    queryKey: ["owner-expense-properties"],
    queryFn: async () => {
      const response = await getManagedProperties({ scope: "own", page: 1, limit: 100 });
      return response.items || [];
    }
  });

  const invalidateExpenses = () => {
    queryClient.invalidateQueries({ queryKey: ["owner-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["owner-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createExpenseMutation = useMutation({
    mutationFn: createOwnerExpense,
    onSuccess: invalidateExpenses
  });

  const updateExpenseMutation = useMutation({
    mutationFn: updateOwnerExpense,
    onSuccess: invalidateExpenses
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: deleteOwnerExpense,
    onSuccess: invalidateExpenses
  });

  return {
    expensesQuery,
    managedPropertiesQuery,
    createExpenseMutation,
    updateExpenseMutation,
    deleteExpenseMutation
  };
};
