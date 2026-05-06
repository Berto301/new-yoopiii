import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePwa } from "../../app/pwa/PwaProvider.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { PERMISSION_IDS } from "../../helpers/constants.js";
import { hasPermission } from "../../helpers/_functions.js";
import { performLogout } from "../../features/auth/utils/logout.js";
import { logoutSuccess, selectCurrentUser } from "../../app/store/session.store.js";
import { Avatar } from "../profile/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import {
  AgenciesIcon,
  BookingIcon,
  CalendarIcon,
  ContractsIcon,
  CrmIcon,
  DashboardIcon,
  ExpensesIcon,
  FavoritesIcon,
  InstallIcon,
  MaintenanceIcon,
  MessagesIcon,
  MoreIcon,
  NotificationsIcon,
  PropertyIcon,
  PublicationsIcon,
  RentIcon,
  SettingsIcon,
  TenantsIcon
} from "./dashboard-icons.jsx";

const buildSidebarItems = (user, t) => {
  const role = user?.role;
  const permissions = user?.permissions || [];
  const isManagementRole = ["agency", "agency_agent", "independent_agent"].includes(role);

  if (role === "proprietaire") {
    return [
      { to: "/dashboard/owner", label: "Dashboard", permission: null, icon: DashboardIcon },
      { to: "/owner/contracts", label: t("layout", "dashboard.owner.contracts", "Gestion de contrats"), permission: null, icon: ContractsIcon },
      { to: "/owner/agencies-agents", label: t("layout", "dashboard.owner.agenciesAgents", "Agents / Agences"), permission: null, icon: AgenciesIcon },
      { to: "/owner/calendar", label: t("layout", "dashboard.owner.calendar", "Calendrier"), permission: null, icon: CalendarIcon },
      { to: "/messages", label: t("layout", "dashboard.owner.messages", "Messages"), permission: null, icon: MessagesIcon },
      { to: "/notifications", label: t("layout", "dashboard.owner.notifications", "Notifications"), permission: null, icon: NotificationsIcon },
      { to: "/owner/rents", label: t("layout", "dashboard.owner.rents", "Gestion de loyers"), permission: null, icon: RentIcon },
      { to: "/owner/expenses", label: t("layout", "dashboard.owner.expenses", "Gestion des depenses"), permission: null, icon: ExpensesIcon },
      { to: "/owner/tenants", label: t("layout", "dashboard.owner.tenants", "Gestion des locataires"), permission: null, icon: TenantsIcon },
      { to: "/owner/properties", label: t("layout", "dashboard.owner.properties", "Mes biens"), permission: null, icon: PropertyIcon },
      { to: "/owner/maintenance", label: t("layout", "dashboard.owner.maintenance", "Gestion de maintenance"), permission: null, icon: MaintenanceIcon },
      { to: "/settings", label: t("layout", "dashboard.owner.settings", "Parametres"), permission: null, icon: SettingsIcon }
    ];
  }

  const baseItems = [
    { to: "/dashboard/user", label: t("layout", "dashboard.shared.overview", "Vue globale"), permission: PERMISSION_IDS.UI_ROUTE_DASHBOARD_USER, icon: DashboardIcon },
    { to: "/dashboard/publications", label: t("layout", "dashboard.shared.publications", "Publication des biens"), permission: PERMISSION_IDS.UI_ROUTE_PUBLICATIONS, icon: PublicationsIcon },
    ...(!isManagementRole
      ? [
          { to: "/favorites", label: t("layout", "dashboard.shared.favorites", "Favoris"), permission: PERMISSION_IDS.UI_ROUTE_FAVORITES, icon: FavoritesIcon },
          { to: "/bookings", label: t("layout", "dashboard.shared.bookings", "Reservations"), permission: PERMISSION_IDS.UI_ROUTE_BOOKINGS, icon: BookingIcon },
          { to: "/agencies-agents", label: t("layout", "dashboard.shared.agenciesAgents", "Agence et Agents"), permission: null, icon: AgenciesIcon }
        ]
      : []),
    { to: "/calendar", label: t("layout", "dashboard.shared.calendar", "Calendrier"), permission: null, icon: CalendarIcon },
    { to: "/messages", label: t("layout", "dashboard.shared.messages", "Messages"), permission: PERMISSION_IDS.UI_ROUTE_MESSAGES, icon: MessagesIcon },
    { to: "/notifications", label: t("layout", "dashboard.shared.notifications", "Notifications"), permission: PERMISSION_IDS.UI_ROUTE_NOTIFICATIONS, icon: NotificationsIcon },
    { to: "/settings", label: t("layout", "dashboard.shared.settings", "Parametres"), permission: PERMISSION_IDS.UI_ROUTE_SETTINGS, icon: SettingsIcon }
  ];

  if (isManagementRole) {
    baseItems.splice(1, 0, { to: "/dashboard/properties", label: t("layout", "dashboard.shared.propertyManagement", "Gestion biens"), permission: PERMISSION_IDS.UI_ROUTE_PROPERTIES, icon: PropertyIcon });
    baseItems.splice(2, 0, { to: "/dashboard/crm-metadata", label: t("layout", "dashboard.shared.crmMetadata", "Metadonnees CRM"), permission: null, icon: CrmIcon });
  }

  if (role === "agency" || role === "independent_agent") {
    baseItems.splice(2, 0, { to: "/contracts", label: t("layout", "dashboard.shared.contracts", "Mes contrats"), permission: null, icon: ContractsIcon });
  }

  if (role === "agency_agent") {
    return baseItems.filter((item) => hasPermission(permissions, item.permission));
  }

  return baseItems;
};

export const DashboardLayout = () => {
  const { t } = useUserPreferences();
  const { canInstall, installApp, pushEnabled, pushSupported } = usePwa();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const sidebarItems = buildSidebarItems(user, t);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || t("layout", "dashboard.userFallback", "Utilisateur");
  const activeItem = useMemo(
    () => sidebarItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) || sidebarItems[0] || null,
    [location.pathname, sidebarItems]
  );
  const mobileItems = sidebarItems;

  const handleLogout = () => {
    performLogout(dispatch, logoutSuccess);
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-stone-950 text-stone-100">
      <div className="mx-auto flex h-full w-full min-w-0 max-w-[1640px]">
        <aside className="hidden h-full w-[308px] shrink-0 border-r border-white/10 bg-white/5 lg:flex">
          <div className="flex h-full min-h-0 w-full flex-col px-5 py-6">
            <div className="mb-6 flex items-center justify-between px-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Yopii</p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Workspace prive</h1>
              </div>
              {canInstall ? (
                <Button type="button" variant="secondary" className="h-11 w-11 rounded-2xl px-0 py-0" onClick={installApp} title="Installer l'application">
                  <InstallIcon />
                </Button>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
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
              <div className="mt-4 flex items-center gap-2 text-xs text-stone-400">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${pushEnabled ? "bg-emerald-400" : pushSupported ? "bg-amber-400" : "bg-stone-500"}`} />
                <span>{pushEnabled ? "Push active" : pushSupported ? "Push disponible" : "Push indisponible"}</span>
              </div>
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
              <nav className="space-y-2">
                {sidebarItems.map((item) => {
                  const Icon = item.icon || MoreIcon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        isActive
                          ? "flex items-center gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/15 px-4 py-3 text-sm font-medium text-white transition-all duration-200" 
                          : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-stone-300 transition hover:bg-white/5 hover:text-white"
                      }
                    >
                      <Icon className="h-5 w-5" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={handleLogout}>
                {t("layout", "dashboard.logout", "Se deconnecter")}
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <header className="border-b border-white/10 bg-stone-950/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Navigation privee</p>
                <h2 className="mt-2 truncate text-2xl font-semibold text-white">{activeItem?.label || "Dashboard"}</h2>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                {canInstall ? (
                  <Button type="button" variant="secondary" className="px-4 py-2" onClick={installApp}>
                    <InstallIcon className="mr-2 h-4 w-4" />
                    Installer
                  </Button>
                ) : null}
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-stone-300">
                  {pushEnabled ? "Push active" : pushSupported ? "Push disponible" : "Push indisponible"}
                </div>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain px-4 py-5 pb-36 sm:px-5 lg:px-8 lg:py-8 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-stone-950/95 px-3 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-[32rem] grid-cols-6 gap-2">
          {mobileItems.map((item) => {
            const Icon = item.icon || MoreIcon;
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                title={item.label}
                className={isActive
                  ? "flex h-12 w-full min-w-0 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/15 text-white"
                  : "flex h-12 w-full min-w-0 items-center justify-center rounded-2xl text-stone-400 transition hover:bg-white/5 hover:text-white"
                }
              >
                <Icon className="h-5 w-5" />
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

