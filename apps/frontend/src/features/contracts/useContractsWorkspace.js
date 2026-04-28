import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../app/store/session.store.js";
import {
  createContract,
  deleteContract,
  getActiveContracts,
  getContractAgents,
  getContractOwners,
  getContractProperties,
  getContracts,
  updateContract,
  uploadContractDocument
} from "./contracts.service.js";

export const useContractsWorkspace = () => {
  const user = useSelector(selectCurrentUser);
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: ["contracts", user?.role, user?.agencyId, user?.id],
    queryFn: () => getContracts(),
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role))
  });

  const ownersQuery = useQuery({
    queryKey: ["contract-owners"],
    queryFn: getContractOwners,
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent"].includes(user.role))
  });

  const propertyOptionsQuery = useQuery({
    queryKey: ["contract-property-options", user?.role, user?.agencyId, user?.id],
    queryFn: getContractProperties,
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role))
  });

  const agentOptionsQuery = useQuery({
    queryKey: ["contract-agent-options", user?.role, user?.agencyId, user?.id],
    queryFn: getContractAgents,
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent"].includes(user.role))
  });

  const activeContractsQuery = useQuery({
    queryKey: ["active-contracts", user?.role, user?.agencyId, user?.id],
    queryFn: getActiveContracts,
    enabled: Boolean(user && ["agency", "agency_agent", "independent_agent"].includes(user.role))
  });

  const invalidateContracts = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["active-contracts"] });
    queryClient.invalidateQueries({ queryKey: ["managed-properties"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createContractMutation = useMutation({
    mutationFn: createContract,
    onSuccess: invalidateContracts
  });

  const updateContractMutation = useMutation({
    mutationFn: updateContract,
    onSuccess: invalidateContracts
  });

  const deleteContractMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: invalidateContracts
  });

  const uploadContractDocumentMutation = useMutation({
    mutationFn: uploadContractDocument,
    onSuccess: invalidateContracts
  });

  return {
    user,
    contractsQuery,
    ownersQuery,
    propertyOptionsQuery,
    agentOptionsQuery,
    activeContractsQuery,
    createContractMutation,
    updateContractMutation,
    deleteContractMutation,
    uploadContractDocumentMutation
  };
};
