import { Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "../guards/PrivateRoute.jsx";
import { RoleRoute } from "../guards/RoleRoute.jsx";
import { PublicLayout } from "../../components/layout/PublicLayout.jsx";
import { AuthLayout } from "../../components/layout/AuthLayout.jsx";
import { DashboardLayout } from "../../components/layout/DashboardLayout.jsx";
import { LandingPage } from "../../pages/public/LandingPage.jsx";
import { LoginPage } from "../../pages/public/LoginPage.jsx";
import { RegisterUserPage } from "../../pages/public/RegisterUserPage.jsx";
import { RegisterAgencyPage } from "../../pages/public/RegisterAgencyPage.jsx";
import { RegisterIndependentAgentPage } from "../../pages/public/RegisterIndependentAgentPage.jsx";
import { PropertySearchPage } from "../../pages/public/PropertySearchPage.jsx";
import { PropertyDetailPage } from "../../pages/public/PropertyDetailPage.jsx";
import { FavoritesPage } from "../../pages/private/FavoritesPage.jsx";
import { BookingsPage } from "../../pages/private/BookingsPage.jsx";
import { ChatPage } from "../../pages/private/ChatPage.jsx";
import { NotificationsPage } from "../../pages/private/NotificationsPage.jsx";
import { UserDashboardPage } from "../../pages/dashboards/UserDashboardPage.jsx";
import { AgentDashboardPage } from "../../pages/dashboards/AgentDashboardPage.jsx";
import { AgencyDashboardPage } from "../../pages/dashboards/AgencyDashboardPage.jsx";
import { AgencyCalendarPage } from "../../pages/dashboards/AgencyCalendarPage.jsx";
import { AgencyExpensesPage } from "../../pages/dashboards/AgencyExpensesPage.jsx";
import { AgencyMembersPage } from "../../pages/dashboards/AgencyMembersPage.jsx";
import { AgentScoringPage } from "../../pages/dashboards/AgentScoringPage.jsx";

export const AppRouter = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/properties" element={<PropertySearchPage />} />
      <Route path="/properties/:slug" element={<PropertyDetailPage />} />
    </Route>

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/user" element={<RegisterUserPage />} />
      <Route path="/register/agency" element={<RegisterAgencyPage />} />
      <Route path="/register/agent" element={<RegisterIndependentAgentPage />} />
    </Route>

    <Route element={<PrivateRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/messages" element={<ChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/dashboard/user" element={<UserDashboardPage />} />

        <Route element={<RoleRoute allowedRoles={["independent_agent"]} />}>
          <Route path="/dashboard/agent" element={<AgentDashboardPage />} />
          <Route path="/dashboard/agent/scoring" element={<AgentScoringPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["agency", "agency_agent"]} />}>
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
