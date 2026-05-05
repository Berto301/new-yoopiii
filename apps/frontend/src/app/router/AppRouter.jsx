import { Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "../guards/PrivateRoute.jsx";
import { RoleRoute } from "../guards/RoleRoute.jsx";
import { PERMISSION_IDS } from "../../helpers/constants.js";
import { PublicLayout } from "../../components/layout/PublicLayout.jsx";
import { AuthLayout } from "../../components/layout/AuthLayout.jsx";
import { DashboardLayout } from "../../components/layout/DashboardLayout.jsx";
import { LandingPage } from "../../pages/public/LandingPage.jsx";
import { LoginPage } from "../../pages/public/LoginPage.jsx";
import { RegisterUserPage } from "../../pages/public/RegisterUserPage.jsx";
import { RegisterOwnerPage } from "../../pages/public/RegisterOwnerPage.jsx";
import { RegisterAgencyPage } from "../../pages/public/RegisterAgencyPage.jsx";
import { RegisterIndependentAgentPage } from "../../pages/public/RegisterIndependentAgentPage.jsx";
import { PropertySearchPage } from "../../pages/public/PropertySearchPage.jsx";
import { PropertyDetailPage } from "../../pages/public/PropertyDetailPage.jsx";
import { PropertyThreeDViewerPage } from "../../pages/public/PropertyThreeDViewerPage.jsx";
import { FavoritesPage } from "../../pages/private/FavoritesPage.jsx";
import { AgenciesAgentsPage } from "../../pages/private/AgenciesAgentsPage.jsx";
import { BookingsPage } from "../../pages/private/BookingsPage.jsx";
import { ChatPage } from "../../pages/private/ChatPage.jsx";
import { CalendarPage } from "../../pages/private/CalendarPage.jsx";
import { NotificationsPage } from "../../pages/private/NotificationsPage.jsx";
import { PublicationsPage } from "../../pages/private/PublicationsPage.jsx";
import { SettingsPage } from "../../pages/private/settings/index.jsx";
import { PropertyManagementPage } from "../../pages/private/Property/index.jsx";
import { UserDashboardPage } from "../../pages/dashboards/UserDashboardPage.jsx";
import { AgentDashboardPage } from "../../pages/dashboards/AgentDashboardPage.jsx";
import { AgencyDashboardPage } from "../../pages/dashboards/AgencyDashboardPage.jsx";
import { AgencyCalendarPage } from "../../pages/dashboards/AgencyCalendarPage.jsx";
import { AgencyExpensesPage } from "../../pages/dashboards/AgencyExpensesPage.jsx";
import { AgencyMembersPage } from "../../pages/dashboards/AgencyMembersPage.jsx";
import { AgentScoringPage } from "../../pages/dashboards/AgentScoringPage.jsx";
import { CrmMetadataPage } from "../../pages/dashboards/CrmMetadataPage.jsx";
import { OwnerDashboardPage } from "../../pages/private/owner/OwnerDashboardPage.jsx";
import { OwnerContractsPage } from "../../pages/private/owner/OwnerContractsPage.jsx";
import { OwnerRentsPage } from "../../pages/private/owner/OwnerRentsPage.jsx";
import { OwnerExpensesPage } from "../../pages/private/owner/OwnerExpensesPage.jsx";
import { OwnerTenantsPage } from "../../pages/private/owner/OwnerTenantsPage.jsx";
import { OwnerPropertiesPage } from "../../pages/private/owner/OwnerPropertiesPage.jsx";
import { OwnerMaintenancePage } from "../../pages/private/owner/OwnerMaintenancePage.jsx";
import { OwnerCalendarPage } from "../../pages/private/owner/OwnerCalendarPage.jsx";
import { ContractsPage } from "../../pages/private/contracts/ContractsPage.jsx";

export const AppRouter = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/properties" element={<PropertySearchPage />} />
      <Route path="/properties/:id" element={<PropertyDetailPage />} />
      <Route path="/properties/:id/3d-tour" element={<PropertyThreeDViewerPage />} />
    </Route>

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/user" element={<RegisterUserPage />} />
      <Route path="/register/owner" element={<RegisterOwnerPage />} />
      <Route path="/register/agency" element={<RegisterAgencyPage />} />
      <Route path="/register/agent" element={<RegisterIndependentAgentPage />} />
    </Route>

    <Route element={<PrivateRoute />}>
      <Route element={<DashboardLayout />}>
        <Route element={<RoleRoute allowedRoles={["user"]} />}>
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/agencies-agents" element={<AgenciesAgentsPage />} />
        </Route>
        <Route path="/messages" element={<ChatPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route element={<RoleRoute allowedRoles={["agency", "independent_agent"]} />}>
          <Route path="/contracts" element={<ContractsPage />} />
        </Route>
        <Route
          element={<RoleRoute allowedRoles={["user", "agency", "agency_agent", "independent_agent"]} requiredPermission={PERMISSION_IDS.UI_ROUTE_PUBLICATIONS} />}
        >
          <Route path="/dashboard/publications" element={<PublicationsPage />} />
        </Route>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/dashboard/user" element={<UserDashboardPage />} />

        <Route element={<RoleRoute allowedRoles={["proprietaire"]} />}>
          <Route path="/dashboard/owner" element={<OwnerDashboardPage />} />
          <Route path="/owner/contracts" element={<OwnerContractsPage />} />
          <Route path="/owner/calendar" element={<OwnerCalendarPage />} />
          <Route path="/owner/rents" element={<OwnerRentsPage />} />
          <Route path="/owner/expenses" element={<OwnerExpensesPage />} />
          <Route path="/owner/tenants" element={<OwnerTenantsPage />} />
          <Route path="/owner/properties" element={<OwnerPropertiesPage />} />
          <Route path="/owner/maintenance" element={<OwnerMaintenancePage />} />
        </Route>

        <Route
          element={<RoleRoute allowedRoles={["agency", "agency_agent", "independent_agent"]} requiredPermission={PERMISSION_IDS.UI_ROUTE_PROPERTIES} />}
        >
          <Route path="/dashboard/properties" element={<PropertyManagementPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["agency", "agency_agent", "independent_agent"]} />}>
          <Route path="/dashboard/crm-metadata" element={<CrmMetadataPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["independent_agent"]} />}>
          <Route path="/dashboard/agent" element={<AgentDashboardPage />} />
          <Route path="/dashboard/agent/scoring" element={<AgentScoringPage />} />
        </Route>

        <Route
          element={<RoleRoute allowedRoles={["agency", "agency_agent"]} requiredPermission={PERMISSION_IDS.UI_ROUTE_AGENCY_DASHBOARD} />}
        >
          <Route path="/dashboard/agency" element={<AgencyDashboardPage />} />
          <Route path="/dashboard/agency/agents" element={<AgencyMembersPage />} />
          <Route path="/dashboard/agency/calendar" element={<AgencyCalendarPage />} />
          <Route path="/dashboard/agency/expenses" element={<AgencyExpensesPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

