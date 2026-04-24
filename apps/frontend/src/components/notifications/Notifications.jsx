import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";

export const Notifications = () => {
  const { preferences } = useUserPreferences();

  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={preferences.theme}
    />
  );
};

export default Notifications;
