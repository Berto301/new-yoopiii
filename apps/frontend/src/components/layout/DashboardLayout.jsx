import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { PERMISSION_IDS } from "../../helpers/constants.js";
import { hasPermission } from "../../helpers/_functions.js";
import { Button } from "../ui/Button.jsx";
import { performLogout } from "../../features/auth/utils/logout.js";
import { logoutSuccess, selectCurrentUser } from "../../app/store/session.store.js";

const buildSidebarItems = (user) => {
  const role = user?.role;
  const permissions = user?.permissions || [];
  const isManagementRole = ["agency", "agency_agent", "independent_agent"].includes(role);
  const baseItems = [
    { to: "/dashboard/user", label: "Vue globale", permission: PERMISSION_IDS.UI_ROUTE_DASHBOARD_USER },
    { to: "/dashboard/publications", label: "Publication des biens", permission: PERMISSION_IDS.UI_ROUTE_PUBLICATIONS },
    ...(!isManagementRole
      ? [
          { to: "/favorites", label: "Favoris", permission: PERMISSION_IDS.UI_ROUTE_FAVORITES },
          { to: "/bookings", label: "Reservations", permission: PERMISSION_IDS.UI_ROUTE_BOOKINGS }
        ]
      : []),
    { to: "/messages", label: "Messages", permission: PERMISSION_IDS.UI_ROUTE_MESSAGES },
    { to: "/notifications", label: "Notifications", permission: PERMISSION_IDS.UI_ROUTE_NOTIFICATIONS },
    { to: "/settings", label: "Parametres", permission: PERMISSION_IDS.UI_ROUTE_SETTINGS }
  ];

  if (isManagementRole) {
    baseItems.splice(1, 0, { to: "/dashboard/properties", label: "Gestion biens", permission: PERMISSION_IDS.UI_ROUTE_PROPERTIES });
  }

  if (role === "agency_agent") {
    return baseItems.filter((item) => hasPermission(permissions, item.permission));
  }

  return baseItems;
};

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const sidebarItems = buildSidebarItems(user);

  const handleLogout = () => {
    performLogout(dispatch, logoutSuccess);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Connecte</p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="mt-1 text-sm capitalize text-brand-100">{user?.role?.replaceAll("_", " ")}</p>
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
              Se deconnecter
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
