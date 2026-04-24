import { Link, NavLink, Outlet } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { BaseListBox } from "../form/BaseListBox.jsx";
import { PublicFooter } from "./PublicFooter.jsx";

export const PublicLayout = () => {
  const { preferences, setLocalPreferences, t } = useUserPreferences();
  const languageOptions = [
    { value: "fr", label: "FR" },
    { value: "en", label: "EN" }
  ];

  const navItems = [
    { to: "/", label: t("layout", "publicNav.home", "Accueil") },
    { to: "/#contact", label: t("layout", "publicNav.contact", "Contact") },
    { to: "/login", label: t("layout", "publicNav.login", "Connexion") }
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-white/10 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-semibold tracking-wide text-brand-100">
            Yopii
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex gap-5 text-sm text-stone-300">
              {navItems.map((item) => (
                item.to.includes("#") ? (
                  <a key={item.to} href={item.to} className="transition hover:text-white">
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => (isActive ? "text-white" : "transition hover:text-white")}
                  >
                    {item.label}
                  </NavLink>
                )
              ))}
            </nav>
            <div className="w-24">
              <BaseListBox
                value={languageOptions.find((option) => option.value === preferences.language) || languageOptions[0]}
                options={languageOptions}
                onChange={(option) => setLocalPreferences({ language: option?.value || "fr" })}
              />
            </div>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
