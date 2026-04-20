import { toast } from "react-toastify";

export const useNotification = () => {
  const showSuccess = (message) => toast.success(message);
  const showError = (typeOrMessage, payload = null) => {
    if (payload && typeof payload === "object") {
      const typeLabel = String(typeOrMessage || "error")
        .replace(/_/g, " ")
        .trim();
      const prefix = typeLabel ? `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)}` : "Erreur";
      const fieldLabel = payload.field ? ` (${payload.field})` : "";
      return toast.error(`${prefix}${fieldLabel}: ${payload.message || "Une erreur est survenue."}`);
    }

    return toast.error(typeOrMessage);
  };
  const showInfo = (message) => toast.info(message);

  return {
    showSuccess,
    showError,
    showInfo
  };
};

export default useNotification;
