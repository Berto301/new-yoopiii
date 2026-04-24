import { USER_PREFERENCES_DEFAULTS, USER_PREFERENCES_STORAGE_KEY } from "./user-preferences.constants.js";

export const loadStoredUserPreferences = () => {
  if (typeof window === "undefined") {
    return USER_PREFERENCES_DEFAULTS;
  }

  try {
    const raw = window.localStorage.getItem(USER_PREFERENCES_STORAGE_KEY);

    if (!raw) {
      return USER_PREFERENCES_DEFAULTS;
    }

    return {
      ...USER_PREFERENCES_DEFAULTS,
      ...JSON.parse(raw)
    };
  } catch (_error) {
    return USER_PREFERENCES_DEFAULTS;
  }
};

export const persistUserPreferences = (preferences) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
};
