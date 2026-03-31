import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import {
  addPropertyToFavorites,
  createManagedProperty,
  deleteManagedProperty,
  duplicateManagedProperty,
  getFavoriteProperties,
  getManagedProperties,
  getPropertyHistory,
  removePropertyFromFavorites,
  updateManagedProperty,
  updatePropertyWorkflow
} from "../services/property.service.js";

export const usePropertyWorkspace = () => {
  const user = useSelector(selectCurrentUser);
  const queryClient = useQueryClient();

  const managedPropertiesQuery = useQuery({
    queryKey: ["managed-properties", user?.role, user?.agencyId],
    queryFn: () =>
      getManagedProperties({
        scope: user?.role === "agency" ? "agency" : "own",
        page: 1,
        limit: 50
      }),
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent"].includes(user.role))
  });

  const favoritePropertiesQuery = useQuery({
    queryKey: ["favorite-properties", user?.id],
    queryFn: () => getFavoriteProperties({ page: 1, limit: 10 }),
    enabled: Boolean(user)
  });

  const propertyHistoryQuery = useQuery({
    queryKey: ["property-history", user?.id],
    queryFn: () => getPropertyHistory({ page: 1, limit: 10 }),
    enabled: Boolean(user)
  });

  const invalidateManaged = () => {
    queryClient.invalidateQueries({ queryKey: ["managed-properties"] });
  };

  const favoriteMutation = useMutation({
    mutationFn: ({ propertyId, isFavorite }) =>
      isFavorite ? removePropertyFromFavorites(propertyId) : addPropertyToFavorites(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-properties"] });
      queryClient.invalidateQueries({ queryKey: ["property-history"] });
      invalidateManaged();
    }
  });

  const workflowMutation = useMutation({
    mutationFn: ({ propertyId, payload }) => updatePropertyWorkflow({ propertyId, payload }),
    onSuccess: () => {
      invalidateManaged();
    }
  });

  const createManagedPropertyMutation = useMutation({
    mutationFn: createManagedProperty,
    onSuccess: () => {
      invalidateManaged();
    }
  });

  const updateManagedPropertyMutation = useMutation({
    mutationFn: updateManagedProperty,
    onSuccess: () => {
      invalidateManaged();
    }
  });

  const duplicateManagedPropertyMutation = useMutation({
    mutationFn: duplicateManagedProperty,
    onSuccess: () => {
      invalidateManaged();
    }
  });

  const deleteManagedPropertyMutation = useMutation({
    mutationFn: deleteManagedProperty,
    onSuccess: () => {
      invalidateManaged();
    }
  });

  return {
    user,
    managedPropertiesQuery,
    favoritePropertiesQuery,
    propertyHistoryQuery,
    favoriteMutation,
    workflowMutation,
    createManagedPropertyMutation,
    updateManagedPropertyMutation,
    duplicateManagedPropertyMutation,
    deleteManagedPropertyMutation
  };
};
