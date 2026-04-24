import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../store/session.store.js";
import { I18N_PAGE_FILES, USER_PREFERENCES_DEFAULTS } from "./user-preferences.constants.js";
import { loadStoredUserPreferences, persistUserPreferences } from "./user-preferences.storage.js";
import { getLocaleTag, normalizeUserPreferences } from "./user-preferences.utils.js";

const UserPreferencesContext = createContext({
  preferences: USER_PREFERENCES_DEFAULTS,
  locale: getLocaleTag(USER_PREFERENCES_DEFAULTS.language),
  dictionaries: {},
  t: (_page, _key, fallback = "") => fallback,
  setLocalPreferences: () => {}
});

const resolveKey = (source, key) =>
  String(key || "")
    .split(".")
    .reduce((currentValue, currentKey) => (currentValue && currentKey in currentValue ? currentValue[currentKey] : undefined), source);

export const UserPreferencesProvider = ({ children }) => {
  const user = useSelector(selectCurrentUser);
  const [preferences, setPreferences] = useState(() => normalizeUserPreferences(user?.preferences || loadStoredUserPreferences()));
  const [dictionaries, setDictionaries] = useState({});

  useEffect(() => {
    setPreferences(normalizeUserPreferences(user?.preferences || loadStoredUserPreferences()));
  }, [user?.preferences]);

  useEffect(() => {
    persistUserPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.theme = preferences.theme;
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.style.colorScheme = preferences.theme;

    const faviconHref = preferences.theme === "dark" ? "/assets/favicon-dark.png" : "/assets/favicon-light.png";
    let favicon = document.querySelector("link[data-app-favicon='true']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      favicon.setAttribute("type", "image/png");
      favicon.setAttribute("data-app-favicon", "true");
      document.head.appendChild(favicon);
    }

    favicon.setAttribute("href", faviconHref);
  }, [preferences.theme]);

  useEffect(() => {
    let cancelled = false;

    const loadDictionaries = async () => {
      try {
        const responses = await Promise.all(
          I18N_PAGE_FILES.map(async (pageName) => {
            const response = await fetch(`/${preferences.language}/${pageName}.json`);
            const data = await response.json();
            return [pageName, data];
          })
        );

        if (!cancelled) {
          setDictionaries(Object.fromEntries(responses));
        }
      } catch (_error) {
        if (!cancelled) {
          setDictionaries({});
        }
      }
    };

    loadDictionaries();

    return () => {
      cancelled = true;
    };
  }, [preferences.language]);

  const value = useMemo(() => {
    const locale = getLocaleTag(preferences.language);

    return {
      preferences,
      locale,
      dictionaries,
      t: (page, key, fallback = "") => resolveKey(dictionaries?.[page], key) || fallback,
      setLocalPreferences: (nextPreferences) => {
        setPreferences((currentPreferences) => normalizeUserPreferences({
          ...currentPreferences,
          ...(typeof nextPreferences === "function" ? nextPreferences(currentPreferences) : nextPreferences)
        }));
      }
    };
  }, [dictionaries, preferences]);

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
};

export const useUserPreferences = () => useContext(UserPreferencesContext);
