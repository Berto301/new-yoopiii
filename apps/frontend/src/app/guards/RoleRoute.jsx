import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { hasPermission } from "../../helpers/_functions.js";
import { selectCurrentUser } from "../store/session.store.js";

const resolveHomePath = (user) => {
  if (!user) {
    return "/dashboard/user";
  }

  if (user.role === "proprietaire") {
    return "/dashboard/owner";
  }

  if (user.role === "independent_agent") {
    return "/dashboard/agent";
  }

  if (user.role === "agency" || user.role === "agency_agent") {
    return "/dashboard/agency";
  }

  return "/dashboard/user";
};

export const RoleRoute = ({ allowedRoles, requiredPermission = null }) => {
  const user = useSelector(selectCurrentUser);
  const fallbackPath = resolveHomePath(user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredPermission && user.role === "agency_agent" && !hasPermission(user.permissions, requiredPermission)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
};
