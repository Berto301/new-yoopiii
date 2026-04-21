import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { getOwnerDashboard } from "../../owner/services/owner.service.js";
import { getLandingOverview } from "../services/landing.service.js";

export const useLandingOverview = () => {
  const currentUser = useSelector(selectCurrentUser);

  const landingQuery = useQuery({
    queryKey: ["landing-overview"],
    queryFn: getLandingOverview
  });

  const ownerOverviewQuery = useQuery({
    queryKey: ["landing-owner-overview", currentUser?.id],
    queryFn: getOwnerDashboard,
    enabled: currentUser?.role === "proprietaire"
  });

  return {
    currentUser,
    landingQuery,
    ownerOverviewQuery
  };
};
