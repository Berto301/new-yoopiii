import { USER_PREFERENCES_DEFAULTS } from "./user-preferences.constants.js";
import { loadStoredUserPreferences } from "./user-preferences.storage.js";

export const normalizeUserPreferences = (preferences = {}) => ({
  ...USER_PREFERENCES_DEFAULTS,
  ...(preferences || {}),
  currency: String(preferences?.currency || USER_PREFERENCES_DEFAULTS.currency).toUpperCase(),
  contractDefaultCommission: Number(preferences?.contractDefaultCommission ?? USER_PREFERENCES_DEFAULTS.contractDefaultCommission)
});

export const getLocaleTag = (language = USER_PREFERENCES_DEFAULTS.language) => (language === "en" ? "en-US" : "fr-FR");

export const getEffectiveUserPreferences = (preferences = null) =>
  normalizeUserPreferences(preferences || loadStoredUserPreferences());

export const formatMoney = (value, currency, preferences = null) => {
  const resolvedPreferences = getEffectiveUserPreferences(preferences);
  const resolvedCurrency = String(resolvedPreferences.currency || currency || USER_PREFERENCES_DEFAULTS.currency).toUpperCase();
  const locale = getLocaleTag(resolvedPreferences.language);

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(value) || 0)} ${resolvedCurrency}`.trim();
};
