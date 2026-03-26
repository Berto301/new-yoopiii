import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessionStore } from "../store/session.store.js";

export const PrivateRoute = () => {
  const { isAuthenticated } = useSessionStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
