import { Link, Outlet } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { BaseListBox } from "../form/BaseListBox.jsx";

const ThemeGlyph = ({ isDark }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    {isDark ? (
      <path d="M12 3.5a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V4.5a1 1 0 0 1 1-1Zm0 13.8a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0v-1.2a1 1 0 0 1 1-1Zm8.5-6.5a1 1 0 0 1 0 2h-1.2a1 1 0 1 1 0-2h1.2Zm-15.8 0a1 1 0 1 1 0 2H3.5a1 1 0 1 1 0-2h1.2Zm11.35-5.15a1 1 0 0 1 1.4 0l.84.84a1 1 0 0 1-1.41 1.41l-.83-.84a1 1 0 0 1 0-1.41ZM6.54 15.86a1 1 0 0 1 1.41 0l.84.84a1 1 0 0 1-1.42 1.41l-.83-.84a1 1 0 0 1 0-1.41Zm11.67 1.25a1 1 0 0 1-1.41 1.41l-.84-.84a1 1 0 0 1 1.42-1.41l.83.84ZM7.95 5.65a1 1 0 0 1 0 1.41l-.84.84A1 1 0 0 1 5.7 6.49l.84-.84a1 1 0 0 1 1.41 0ZM12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8Z" fill="currentColor" />
    ) : (
      <path d="M14.8 3.9a7.8 7.8 0 1 0 5.3 13.5a8.3 8.3 0 1 1-5.3-13.5Z" fill="#000000" />
    )}
  </svg>
);

export const AuthLayout = () => {
  const { preferences, setLocalPreferences } = useUserPreferences();
  const languageOptions = [
    { value: "fr", label: "FR" },
    { value: "en", label: "EN" }
  ];
  const isDark = preferences.theme === "dark";
  const logoSrc = isDark ? "/assets/favicon-dark.png" : "/assets/favicon-light.png";

  return (
    <div className="min-h-screen px-6 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-stone-200 transition hover:border-white/20 hover:text-white"
        >
          <img src={logoSrc} alt="Yopii" className="h-5 w-5 object-contain" />
          <span>Retour a l'accueil</span>
        </Link>

        <div className="flex items-center gap-3">
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

      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-100">Yopii Access</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Connectez les projets immobiliers aux bonnes personnes, au bon endroit.
          </h1>
          <p className="max-w-xl text-base leading-8 text-stone-300">
            Authentification multi-profils, recherche geolocalisee, messagerie temps reel et pilotage agence dans une interface unifiee.
          </p>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 md:p-8">
          <Outlet />
        </section>
      </div>
    </div>
  );
};
