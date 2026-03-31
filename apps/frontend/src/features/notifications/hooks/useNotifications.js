import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { getNotifications, markNotificationRead } from "../services/notification.service.js";

export const useNotifications = () => {
  const user = useSelector(selectCurrentUser);
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotifications({ limit: 50 }),
    enabled: Boolean(user)
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  return {
    notificationsQuery,
    markReadMutation
  };
};
