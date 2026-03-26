import { Navigate, Outlet } from "react-router-dom";
import { useSessionStore } from "../store/session.store.js";

export const RoleRoute = ({ allowedRoles }) => {
  const user = useSessionStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard/user" replace />;
  }

  return <Outlet />;
};
