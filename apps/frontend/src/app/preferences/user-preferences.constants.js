export const USER_PREFERENCES_STORAGE_KEY = "yopii-user-preferences";

export const USER_PREFERENCES_DEFAULTS = {
  language: "fr",
  theme: "dark",
  currency: "USD",
  contractDefaultCommission: 0
};

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Francais" }
];

export const THEME_OPTIONS = [
  { value: "light", label: "Light Mode" },
  { value: "dark", label: "Dark Mode" }
];

export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "MGA", label: "MGA" }
];

export const I18N_PAGE_FILES = ["messages", "settings", "layout", "auth", "landing", "private"];
