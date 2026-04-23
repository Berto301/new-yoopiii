import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { createContract, getActiveContracts, getContracts, updateContract, uploadContractDocument } from "../../contracts/contracts.service.js";
import { getOwnerTenants } from "../../owner/services/owner.service.js";
import {
  addPropertyToFavorites,
  createManagedProperty,
  deleteManagedProperty,
  duplicateManagedProperty,
  generateManagedPropertyThreeD,
  getPropertyPublications,
  getFavoriteProperties,
  getManagedProperties,
  getPropertyHistory,
  releasePropertyReservation,
  removePropertyFromFavorites,
  reserveProperty,
  uploadPropertyAsset,
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
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role))
  });

  const favoritePropertiesQuery = useQuery({
    queryKey: ["favorite-properties", user?.id],
    queryFn: () => getFavoriteProperties({ page: 1, limit: 10 }),
    enabled: Boolean(user)
  });

  const propertyPublicationsQuery = useQuery({
    queryKey: ["property-publications", user?.id],
    queryFn: () => getPropertyPublications({ page: 1, limit: 100 }),
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
      queryClient.invalidateQueries({ queryKey: ["property-publications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      invalidateManaged();
    }
  });

  const reservationMutation = useMutation({
    mutationFn: ({ propertyId, action }) =>
      action === "release" ? releasePropertyReservation(propertyId) : reserveProperty(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-publications"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-properties"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

  const activeContractsQuery = useQuery({
    queryKey: ["active-contracts", user?.role, user?.agencyId, user?.id],
    queryFn: getActiveContracts,
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role))
  });

  const contractsQuery = useQuery({
    queryKey: ["property-contracts", user?.role, user?.agencyId, user?.id],
    queryFn: getContracts,
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role))
  });

  const tenantSuggestionsQuery = useQuery({
    queryKey: ["property-tenant-suggestions", user?.id],
    queryFn: getOwnerTenants,
    enabled: Boolean(user?.role === "proprietaire")
  });

  const uploadPropertyAssetMutation = useMutation({
    mutationFn: uploadPropertyAsset
  });

  const createContractMutation = useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["property-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["active-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      invalidateManaged();
    }
  });

  const updateContractMutation = useMutation({
    mutationFn: updateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["property-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["active-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      invalidateManaged();
    }
  });

  const uploadContractDocumentMutation = useMutation({
    mutationFn: uploadContractDocument
  });

  const updateManagedPropertyMutation = useMutation({
    mutationFn: updateManagedProperty,
    onSuccess: () => {
      invalidateManaged();
    }
  });

  const generateManagedPropertyThreeDMutation = useMutation({
    mutationFn: generateManagedPropertyThreeD,
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
    activeContractsQuery,
    contractsQuery,
    tenantSuggestionsQuery,
    favoritePropertiesQuery,
    propertyPublicationsQuery,
    propertyHistoryQuery,
    favoriteMutation,
    reservationMutation,
    workflowMutation,
    createManagedPropertyMutation,
    createContractMutation,
    uploadContractDocumentMutation,
    uploadPropertyAssetMutation,
    updateContractMutation,
    updateManagedPropertyMutation,
    generateManagedPropertyThreeDMutation,
    duplicateManagedPropertyMutation,
    deleteManagedPropertyMutation
  };
};
