import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { getBookings } from "../services/booking.service.js";

export const useBookingsWorkspace = () => {
  const user = useSelector(selectCurrentUser);

  const bookingsQuery = useQuery({
    queryKey: ["bookings", user?.id, user?.agencyId, user?.role],
    queryFn: getBookings,
    enabled: Boolean(user)
  });

  return {
    user,
    bookingsQuery
  };
};
