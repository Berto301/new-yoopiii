import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const Notifications = () => (
  <ToastContainer
    position="top-right"
    autoClose={3500}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="dark"
  />
);

export default Notifications;
