import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { getConversations, getConversationMessages, getUnreadConversationCount } from "../../chat/services/chat.service.js";
import { buildDashboardAppointments, sortByNewest, sortByUpcoming } from "../dashboard.utils.js";

export const useDashboardMessaging = () => {
  const currentUser = useSelector(selectCurrentUser);

  const conversationsQuery = useQuery({
    queryKey: ["dashboard-conversations", currentUser?.id],
    queryFn: getConversations,
    enabled: Boolean(currentUser)
  });

  const unreadCountQuery = useQuery({
    queryKey: ["dashboard-unread-messages", currentUser?.id],
    queryFn: getUnreadConversationCount,
    enabled: Boolean(currentUser)
  });

  const conversationIds = useMemo(
    () => (conversationsQuery.data || []).slice(0, 8).map((conversation) => conversation.id),
    [conversationsQuery.data]
  );

  const appointmentQueries = useQueries({
    queries: conversationIds.map((conversationId) => ({
      queryKey: ["dashboard-appointments", conversationId],
      queryFn: () => getConversationMessages({ conversationId, page: 1, limit: 100 }),
      enabled: Boolean(conversationId)
    }))
  });

  const appointments = useMemo(
    () => buildDashboardAppointments({
      conversations: (conversationsQuery.data || []).slice(0, 8),
      messagePages: appointmentQueries.map((query) => query.data),
      currentUser
    }),
    [appointmentQueries, conversationsQuery.data, currentUser]
  );

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    return sortByUpcoming(
      appointments.filter((appointment) => new Date(appointment.start).getTime() >= now),
      (appointment) => appointment.start
    );
  }, [appointments]);

  const recentConversations = useMemo(
    () => sortByNewest(conversationsQuery.data || [], (conversation) => conversation.lastMessageAt || conversation.updatedAt).slice(0, 5),
    [conversationsQuery.data]
  );

  return {
    currentUser,
    conversationsQuery,
    unreadCountQuery,
    appointmentQueries,
    appointments,
    upcomingAppointments,
    recentConversations,
    isLoadingAppointments: conversationsQuery.isLoading || appointmentQueries.some((query) => query.isLoading),
    hasAppointmentError: conversationsQuery.isError || appointmentQueries.some((query) => query.isError)
  };
};
