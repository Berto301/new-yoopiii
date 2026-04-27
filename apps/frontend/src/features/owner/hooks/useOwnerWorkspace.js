import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getManagedProperties } from "../../properties/services/property.service.js";
import {
  createOwnerTenant,
  createOwnerMaintenanceTicket,
  deleteOwnerTenant,
  deleteOwnerMaintenanceTicket,
  getOwnerContracts,
  getOwnerDashboard,
  getOwnerMaintenance,
  getOwnerProperties,
  getOwnerRents,
  getOwnerTenants,
  updateOwnerTenant,
  updateOwnerMaintenanceTicket
} from "../services/owner.service.js";

export const useOwnerWorkspace = () => {
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["owner-dashboard"],
    queryFn: getOwnerDashboard
  });

  const contractsQuery = useQuery({
    queryKey: ["owner-contracts"],
    queryFn: getOwnerContracts
  });

  const rentsQuery = useQuery({
    queryKey: ["owner-rents"],
    queryFn: getOwnerRents
  });

  const tenantsQuery = useQuery({
    queryKey: ["owner-tenants"],
    queryFn: getOwnerTenants
  });

  const propertiesQuery = useQuery({
    queryKey: ["owner-properties"],
    queryFn: getOwnerProperties
  });

  const maintenanceQuery = useQuery({
    queryKey: ["owner-maintenance"],
    queryFn: getOwnerMaintenance
  });

  const managedPropertiesQuery = useQuery({
    queryKey: ["owner-maintenance-properties"],
    queryFn: async () => {
      const response = await getManagedProperties({ scope: "own", page: 1, limit: 100 });
      return response.items || [];
    }
  });

  const invalidateOwnerWorkspace = () => {
    queryClient.invalidateQueries({ queryKey: ["owner-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["owner-tenants"] });
    queryClient.invalidateQueries({ queryKey: ["owner-maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["property-publications"] });
    queryClient.invalidateQueries({ queryKey: ["owner-maintenance-properties"] });
    queryClient.invalidateQueries({ queryKey: ["owner-properties"] });
    queryClient.invalidateQueries({ queryKey: ["managed-properties"] });
    queryClient.invalidateQueries({ queryKey: ["owner-expenses"] });
  };

  const createMaintenanceTicketMutation = useMutation({
    mutationFn: createOwnerMaintenanceTicket,
    onSuccess: invalidateOwnerWorkspace
  });

  const createTenantMutation = useMutation({
    mutationFn: createOwnerTenant,
    onSuccess: invalidateOwnerWorkspace
  });

  const updateTenantMutation = useMutation({
    mutationFn: updateOwnerTenant,
    onSuccess: invalidateOwnerWorkspace
  });

  const deleteTenantMutation = useMutation({
    mutationFn: deleteOwnerTenant,
    onSuccess: invalidateOwnerWorkspace
  });

  const updateMaintenanceTicketMutation = useMutation({
    mutationFn: updateOwnerMaintenanceTicket,
    onSuccess: invalidateOwnerWorkspace
  });

  const deleteMaintenanceTicketMutation = useMutation({
    mutationFn: deleteOwnerMaintenanceTicket,
    onSuccess: invalidateOwnerWorkspace
  });

  return {
    dashboardQuery,
    contractsQuery,
    rentsQuery,
    tenantsQuery,
    propertiesQuery,
    maintenanceQuery,
    managedPropertiesQuery,
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
    createMaintenanceTicketMutation,
    updateMaintenanceTicketMutation,
    deleteMaintenanceTicketMutation
  };
};
