import { useSelector } from "react-redux";
import { Link, Outlet } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { selectCurrentUser, selectIsAuthenticated } from "../../app/store/session.store.js";

const getDashboardPath = (user) => {
  if (!user) {
    return "/login";
  }

  if (user.role === "agency" || user.role === "agency_agent") {
    return "/dashboard/agency";
  }

  if (user.role === "independent_agent") {
    return "/dashboard/agent";
  }

  if (user.role === "proprietaire") {
    return "/dashboard/owner";
  }

  return "/dashboard/user";
};

const getPropertyManagementPath = (user) => {
  if (!user || !["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role)) {
    return null;
  }

  return user.role === "proprietaire" ? "/owner/properties" : "/dashboard/properties";
};

export const MainLayout = () => {
  const { t } = useUserPreferences();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const propertyManagementPath = getPropertyManagementPath(user);

  const navigation = [
    { to: "/", label: t("layout", "mainNav.home", "Accueil") },
    { to: "/properties", label: t("layout", "mainNav.properties", "Biens") },
    { to: getDashboardPath(user), label: t("layout", "mainNav.dashboard", "Dashboard") },
    ...(propertyManagementPath ? [{ to: propertyManagementPath, label: t("layout", "mainNav.propertyManagement", "Gestion biens") }] : []),
    ...(isAuthenticated ? [{ to: "/messages", label: t("layout", "mainNav.messages", "Messages") }] : [])
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-white/10 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-semibold tracking-wide text-brand-100">
            Yopii
          </Link>
          <nav className="flex gap-5 text-sm text-stone-300">
            {navigation.map((item) => (
              <Link key={item.to} to={item.to} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
