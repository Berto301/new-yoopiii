import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { selectCurrentUser } from "../store/session.store.js";

export const RoleRoute = ({ allowedRoles }) => {
  const user = useSelector(selectCurrentUser);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard/user" replace />;
  }

  return <Outlet />;
};
