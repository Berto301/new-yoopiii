import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { hasPermission } from "../../helpers/_functions.js";
import { selectCurrentUser } from "../store/session.store.js";

export const RoleRoute = ({ allowedRoles, requiredPermission = null }) => {
  const user = useSelector(selectCurrentUser);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard/user" replace />;
  }

  if (requiredPermission && user.role === "agency_agent" && !hasPermission(user.permissions, requiredPermission)) {
    return <Navigate to="/dashboard/user" replace />;
  }

  return <Outlet />;
};
