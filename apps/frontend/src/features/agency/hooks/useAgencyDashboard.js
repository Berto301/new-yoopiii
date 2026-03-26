import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "../../../app/store/session.store.js";
import {
  getAgencyCalendarEvents,
  getAgencyDashboardSummary,
  getAgencyExpenses,
  getAgencyMembers
} from "../services/agency.service.js";

export const useAgencyDashboard = () => {
  const agencyId = useSessionStore((state) => state.user?.agencyId);

  const summaryQuery = useQuery({
    queryKey: ["agency-dashboard-summary", agencyId],
    queryFn: () => getAgencyDashboardSummary(agencyId),
    enabled: Boolean(agencyId)
  });

  const membersQuery = useQuery({
    queryKey: ["agency-members", agencyId],
    queryFn: () => getAgencyMembers(agencyId),
    enabled: Boolean(agencyId)
  });

  const expensesQuery = useQuery({
    queryKey: ["agency-expenses", agencyId],
    queryFn: () => getAgencyExpenses(agencyId),
    enabled: Boolean(agencyId)
  });

  const eventsQuery = useQuery({
    queryKey: ["agency-calendar-events", agencyId],
    queryFn: () => getAgencyCalendarEvents(agencyId),
    enabled: Boolean(agencyId)
  });

  return {
    agencyId,
    summaryQuery,
    membersQuery,
    expensesQuery,
    eventsQuery
  };
};
