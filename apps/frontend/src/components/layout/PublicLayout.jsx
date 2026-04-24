import { Link, NavLink, Outlet } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { BaseListBox } from "../form/BaseListBox.jsx";
import { PublicFooter } from "./PublicFooter.jsx";

const ThemeGlyph = ({ isDark }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    {isDark ? (
      <path d="M12 3.5a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V4.5a1 1 0 0 1 1-1Zm0 13.8a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0v-1.2a1 1 0 0 1 1-1Zm8.5-6.5a1 1 0 0 1 0 2h-1.2a1 1 0 1 1 0-2h1.2Zm-15.8 0a1 1 0 1 1 0 2H3.5a1 1 0 1 1 0-2h1.2Zm11.35-5.15a1 1 0 0 1 1.4 0l.84.84a1 1 0 0 1-1.41 1.41l-.83-.84a1 1 0 0 1 0-1.41ZM6.54 15.86a1 1 0 0 1 1.41 0l.84.84a1 1 0 0 1-1.42 1.41l-.83-.84a1 1 0 0 1 0-1.41Zm11.67 1.25a1 1 0 0 1-1.41 1.41l-.84-.84a1 1 0 0 1 1.42-1.41l.83.84ZM7.95 5.65a1 1 0 0 1 0 1.41l-.84.84A1 1 0 0 1 5.7 6.49l.84-.84a1 1 0 0 1 1.41 0ZM12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8Z" fill="currentColor" />
    ) : (
      <path d="M14.8 3.9a7.8 7.8 0 1 0 5.3 13.5a8.3 8.3 0 1 1-5.3-13.5Z" fill="#000000" />
    )}
  </svg>
);

export const PublicLayout = () => {
  const { preferences, setLocalPreferences, t } = useUserPreferences();
  const languageOptions = [
    { value: "fr", label: "FR" },
    { value: "en", label: "EN" }
  ];
  const isDark = preferences.theme === "dark";
  const logoSrc = isDark ? "/assets/favicon-dark.png" : "/assets/favicon-light.png";

  const navItems = [
    { to: "/", label: t("layout", "publicNav.home", "Home") },
    { to: "/#about", label: t("layout", "publicNav.about", "About") },
    { to: "/#properties", label: t("layout", "publicNav.properties", "Property") },
    { to: "/#types", label: t("layout", "publicNav.terrain", "Terrain") },
    { to: "/#agents", label: t("layout", "publicNav.agents", "Agents") },
    { to: "/login", label: t("layout", "publicNav.login", "Login") }
  ];

  return (
    <div className="min-h-screen bg-transparent text-stone-100">
      <header data-ui="public-header" className="sticky top-0 z-40 border-b border-white/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3 text-brand-500">
            <img src={logoSrc} alt="Yopii" className="h-7 w-7 object-contain" />
            <span className="text-3xl font-bold tracking-tight">Yopii</span>
          </Link>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 lg:gap-6">
            <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-stone-500">
              {navItems.map((item) =>
                item.to.includes("#") ? (
                  <a key={item.to} href={item.to} className="transition hover:text-brand-500">
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => (isActive ? "text-brand-500" : "transition hover:text-brand-500")}
                  >
                    {item.label}
                  </NavLink>
                )
              )}
            </nav>

            <button
              type="button"
               className={`inline-flex h-11 items-center gap-2 rounded-full border border-brand-300/40 bg-white/5 px-4 text-sm font-medium ${!isDark ? "text-black" : "text-brand-100"} transition hover:bg-brand-500 hover:text-white`}
              onClick={() => setLocalPreferences({ theme: isDark ? "light" : "dark" })}
            >
              <ThemeGlyph isDark={isDark} />
              <span>{isDark ? "Light" : "Dark"}</span>
            </button>

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
