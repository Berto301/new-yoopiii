export const USER_PREFERENCES_STORAGE_KEY = "yopii-user-preferences";

export const USER_PREFERENCES_DEFAULTS = {
  language: "fr",
  theme: "light",
  currency: "USD",
  notificationsEnabled: true,
  pushNotificationsEnabled: false,
  contractDefaultCommission: 0,
  smartMatching: {
    enabled: false,
    budgetReal: null,
    purpose: "",
    propertyTypes: [],
    location: {
      enabled: false,
      lat: null,
      lng: null,
      label: ""
    },
    searchRadiusKm: 5,
    criteria: {
      version: 1,
      custom: {}
    }
  }
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
