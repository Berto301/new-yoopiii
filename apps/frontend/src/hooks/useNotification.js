import { toast } from "react-toastify";

export const useNotification = () => {
  const showSuccess = (message) => toast.success(message);
  const showError = (message) => toast.error(message);
  const showInfo = (message) => toast.info(message);

  return {
    showSuccess,
    showError,
    showInfo
  };
};

export default useNotification;
