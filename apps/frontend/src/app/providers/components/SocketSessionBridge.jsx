import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectAccessToken, selectCurrentUser, selectIsAuthenticated } from "../../store/session.store.js";
import { connectSocketWithToken, disconnectSocket, socket } from "../../../lib/socket/socket.js";

export const SocketSessionBridge = () => {
  const queryClient = useQueryClient();
  const accessToken = useSelector(selectAccessToken);
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) {
      disconnectSocket();
      return undefined;
    }

    connectSocketWithToken(accessToken);

    const subscribeNotifications = () => {
      socket.emit("notification:subscribe", { userId: user.id }, () => {});
    };

    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations-unread"] });
    };

    socket.on("connect", subscribeNotifications);
    socket.on("notification:new", handleNotification);

    if (socket.connected) {
      subscribeNotifications();
    }

    return () => {
      socket.off("connect", subscribeNotifications);
      socket.off("notification:new", handleNotification);
    };
  }, [accessToken, isAuthenticated, queryClient, user]);

  return null;
};
