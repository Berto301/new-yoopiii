import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { PERMISSION_IDS } from "../../helpers/constants.js";
import { hasPermission } from "../../helpers/_functions.js";
import { performLogout } from "../../features/auth/utils/logout.js";
import { logoutSuccess, selectCurrentUser } from "../../app/store/session.store.js";
import { Avatar } from "../profile/Avatar.jsx";
import { Button } from "../ui/Button.jsx";

const buildSidebarItems = (user, t) => {
  const role = user?.role;
  const permissions = user?.permissions || [];
  const isManagementRole = ["agency", "agency_agent", "independent_agent"].includes(role);

  if (role === "proprietaire") {
    return [
      { to: "/dashboard/owner", label: "Dashboard", permission: null },
      { to: "/owner/contracts", label: t("layout", "dashboard.owner.contracts", "Gestion de contrats"), permission: null },
      { to: "/owner/calendar", label: t("layout", "dashboard.owner.calendar", "Calendrier"), permission: null },
      { to: "/messages", label: t("layout", "dashboard.owner.messages", "Messages"), permission: null },
      { to: "/notifications", label: t("layout", "dashboard.owner.notifications", "Notifications"), permission: null },
      { to: "/owner/rents", label: t("layout", "dashboard.owner.rents", "Gestion de loyers"), permission: null },
      { to: "/owner/expenses", label: t("layout", "dashboard.owner.expenses", "Gestion des depenses"), permission: null },
      { to: "/owner/tenants", label: t("layout", "dashboard.owner.tenants", "Gestion des locataires"), permission: null },
      { to: "/owner/properties", label: t("layout", "dashboard.owner.properties", "Mes biens"), permission: null },
      { to: "/owner/maintenance", label: t("layout", "dashboard.owner.maintenance", "Gestion de maintenance"), permission: null },
      { to: "/settings", label: t("layout", "dashboard.owner.settings", "Parametres"), permission: null }
    ];
  }

  const baseItems = [
    { to: "/dashboard/user", label: t("layout", "dashboard.shared.overview", "Vue globale"), permission: PERMISSION_IDS.UI_ROUTE_DASHBOARD_USER },
    { to: "/dashboard/publications", label: t("layout", "dashboard.shared.publications", "Publication des biens"), permission: PERMISSION_IDS.UI_ROUTE_PUBLICATIONS },
    ...(!isManagementRole
      ? [
          { to: "/favorites", label: t("layout", "dashboard.shared.favorites", "Favoris"), permission: PERMISSION_IDS.UI_ROUTE_FAVORITES },
          { to: "/bookings", label: t("layout", "dashboard.shared.bookings", "Reservations"), permission: PERMISSION_IDS.UI_ROUTE_BOOKINGS },
          { to: "/agencies-agents", label: t("layout", "dashboard.shared.agenciesAgents", "Agence et Agents"), permission: null }
        ]
      : []),
    { to: "/calendar", label: t("layout", "dashboard.shared.calendar", "Calendrier"), permission: null },
    { to: "/messages", label: t("layout", "dashboard.shared.messages", "Messages"), permission: PERMISSION_IDS.UI_ROUTE_MESSAGES },
    { to: "/notifications", label: t("layout", "dashboard.shared.notifications", "Notifications"), permission: PERMISSION_IDS.UI_ROUTE_NOTIFICATIONS },
    { to: "/settings", label: t("layout", "dashboard.shared.settings", "Parametres"), permission: PERMISSION_IDS.UI_ROUTE_SETTINGS }
  ];

  if (isManagementRole) {
    baseItems.splice(1, 0, { to: "/dashboard/properties", label: t("layout", "dashboard.shared.propertyManagement", "Gestion biens"), permission: PERMISSION_IDS.UI_ROUTE_PROPERTIES });
  }

  if (role === "agency" || role === "independent_agent") {
    baseItems.splice(2, 0, { to: "/contracts", label: t("layout", "dashboard.shared.contracts", "Mes contrats"), permission: null });
  }

  if (role === "agency_agent") {
    return baseItems.filter((item) => hasPermission(permissions, item.permission));
  }

  return baseItems;
};

export const DashboardLayout = () => {
  const { t } = useUserPreferences();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const sidebarItems = buildSidebarItems(user, t);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || t("layout", "dashboard.userFallback", "Utilisateur");

  const handleLogout = () => {
    performLogout(dispatch, logoutSuccess);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("layout", "dashboard.connected", "Connecte")}</p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar
                src={user?.avatar}
                alt={`Photo de profil de ${fullName}`}
                name={fullName}
                size="sm"
                variant="sidebar"
                type={user?.role?.includes("agent") ? "agent" : "user"}
              />
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-white">{fullName}</h2>
                <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-brand-100">{user?.role === "proprietaire" ? t("layout", "dashboard.ownerRole", "proprietaire") : user?.role?.replaceAll("_", " ")}</p>
              </div>
            </div>
          </div>
          <nav className="mt-8 space-y-2">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive
                    ? "block rounded-2xl bg-brand-500 px-4 py-3 text-sm font-medium text-white"
                    : "block rounded-2xl px-4 py-3 text-sm text-stone-300 transition hover:bg-white/5 hover:text-white"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-8">
            <Button type="button" variant="secondary" className="w-full" onClick={handleLogout}>
              {t("layout", "dashboard.logout", "Se deconnecter")}
            </Button>
          </div>
        </aside>
        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
};
