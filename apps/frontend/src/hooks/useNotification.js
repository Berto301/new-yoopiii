import { toast } from "react-toastify";
import { useUserPreferences } from "../app/preferences/UserPreferencesProvider.jsx";

export const useNotification = () => {
  const { t } = useUserPreferences();

  const resolveMessage = (messageOrKey, options = {}) => {
    if (!options.translate) {
      return messageOrKey;
    }

    return t(options.page || "messages", messageOrKey, options.fallback || messageOrKey);
  };

  const showSuccess = (messageOrKey, options = {}) => toast.success(resolveMessage(messageOrKey, options));

  const showError = (typeOrMessage, payload = null, options = {}) => {
    if (payload && typeof payload === "object") {
      const typeLabel = String(typeOrMessage || "error")
        .replace(/_/g, " ")
        .trim();
      const prefix = typeLabel ? `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)}` : "Erreur";
      const fieldLabel = payload.field ? ` (${payload.field})` : "";
      return toast.error(`${prefix}${fieldLabel}: ${payload.message || "Une erreur est survenue."}`);
    }

    return toast.error(resolveMessage(typeOrMessage, options));
  };

  const showInfo = (messageOrKey, options = {}) => toast.info(resolveMessage(messageOrKey, options));

  return {
    showSuccess,
    showError,
    showInfo
  };
};

export default useNotification;
