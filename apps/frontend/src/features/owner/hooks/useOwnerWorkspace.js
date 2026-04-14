import { useQuery } from "@tanstack/react-query";
import { getOwnerContracts, getOwnerDashboard, getOwnerMaintenance, getOwnerProperties, getOwnerRents, getOwnerTenants } from "../services/owner.service.js";

export const useOwnerWorkspace = () => {
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

  return {
    dashboardQuery,
    contractsQuery,
    rentsQuery,
    tenantsQuery,
    propertiesQuery,
    maintenanceQuery
  };
};
