import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasStoredSession, selectIsAuthenticated } from "../store/session.store.js";

export const PrivateRoute = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  const hasSessionInStorage = hasStoredSession();

  if (!isAuthenticated || !hasSessionInStorage) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
