import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { selectAccessToken, selectCurrentUser } from "../../../app/store/session.store.js";
import { connectSocketWithToken, socket } from "../../../lib/socket/socket.js";
import {
  deleteConversationMessage,
  deleteConversationsWithParticipant,
  getConversationMessages,
  getConversations,
  getUnreadConversationCount,
  markConversationMessageRead,
  sendConversationMessage,
  updateConversationMessage,
  uploadConversationAttachments
} from "../services/chat.service.js";

const appendIfMissing = (items, nextItem) => {
  if (items.some((item) => item.id === nextItem.id)) {
    return items;
  }

  return [...items, nextItem];
};

export const useChatWorkspace = () => {
  const user = useSelector(selectCurrentUser);
  const accessToken = useSelector(selectAccessToken);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [typingByConversation, setTypingByConversation] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});

  const conversationsQuery = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: getConversations,
    enabled: Boolean(user)
  });

  const unreadCountQuery = useQuery({
    queryKey: ["conversations-unread", user?.id],
    queryFn: getUnreadConversationCount,
    enabled: Boolean(user)
  });

  useEffect(() => {
    const conversationIdFromQuery = searchParams.get("conversationId");

    if (conversationIdFromQuery) {
      setSelectedConversationId(conversationIdFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedConversationId && conversationsQuery.data?.length) {
      setSelectedConversationId(conversationsQuery.data[0].id);
    }
  }, [conversationsQuery.data, selectedConversationId]);

  const messagesQuery = useQuery({
    queryKey: ["conversation-messages", selectedConversationId],
    queryFn: () => getConversationMessages({ conversationId: selectedConversationId, page: 1, limit: 50 }),
    enabled: Boolean(selectedConversationId)
  });

  useEffect(() => {
    if (!accessToken || !user) {
      return undefined;
    }

    connectSocketWithToken(accessToken);

    const handleConnect = () => {
      socket.emit("notification:subscribe", { userId: user.id }, () => {});
    };

    const handlePresenceOnline = ({ userId }) => {
      setOnlineUsers((current) => ({ ...current, [userId]: true }));
    };

    const handlePresenceOffline = ({ userId }) => {
      setOnlineUsers((current) => ({ ...current, [userId]: false }));
    };

    const handleConversationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleNotificationNew = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["conversations-unread"] });
    };

    socket.on("connect", handleConnect);
    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);
    socket.on("conversation:updated", handleConversationUpdated);
    socket.on("notification:new", handleNotificationNew);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
      socket.off("conversation:updated", handleConversationUpdated);
      socket.off("notification:new", handleNotificationNew);
    };
  }, [accessToken, queryClient, user]);

  useEffect(() => {
    if (!selectedConversationId || !socket.connected) {
      return undefined;
    }

    socket.emit("conversation:join", { conversationId: selectedConversationId }, () => {});

    const handleMessageNew = ({ conversationId, message }) => {
      if (conversationId !== selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["conversations-unread"] });
        return;
      }

      queryClient.setQueryData(["conversation-messages", selectedConversationId], (current) => {
        const items = current?.items || [];
        return {
          ...(current || { pagination: { page: 1, limit: 50, total: 0, hasNextPage: false } }),
          items: appendIfMissing(items, message)
        };
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations-unread"] });
    };

    const handleMessageDelivered = ({ conversationId, messageId, deliveredAt }) => {
      if (conversationId !== selectedConversationId) {
        return;
      }

      queryClient.setQueryData(["conversation-messages", selectedConversationId], (current) => ({
        ...current,
        items: (current?.items || []).map((message) =>
          message.id === messageId ? { ...message, status: "delivered", deliveredAt } : message
        )
      }));
    };

    const handleMessageRead = ({ conversationId, messageId, readAt }) => {
      if (conversationId !== selectedConversationId) {
        return;
      }

      queryClient.setQueryData(["conversation-messages", selectedConversationId], (current) => ({
        ...current,
        items: (current?.items || []).map((message) =>
          message.id === messageId ? { ...message, status: "read", readAt } : message
        )
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations-unread"] });
    };

    const handleMessageUpdated = ({ conversationId, message }) => {
      if (conversationId !== selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        return;
      }

      queryClient.setQueryData(["conversation-messages", selectedConversationId], (current) => ({
        ...(current || { pagination: { page: 1, limit: 50, total: 0, hasNextPage: false } }),
        items: (current?.items || []).map((item) => (item.id === message.id ? { ...item, ...message } : item))
      }));
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleTyping = ({ conversationId, userId, isTyping }) => {
      if (conversationId !== selectedConversationId || userId === user?.id) {
        return;
      }

      setTypingByConversation((current) => ({
        ...current,
        [conversationId]: isTyping ? userId : null
      }));
    };

    socket.on("message:new", handleMessageNew);
    socket.on("message:delivered", handleMessageDelivered);
    socket.on("message:read", handleMessageRead);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("conversation:typing", handleTyping);

    return () => {
      socket.emit("conversation:leave", { conversationId: selectedConversationId }, () => {});
      socket.off("message:new", handleMessageNew);
      socket.off("message:delivered", handleMessageDelivered);
      socket.off("message:read", handleMessageRead);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("conversation:typing", handleTyping);
    };
  }, [queryClient, selectedConversationId, user?.id]);

  useEffect(() => {
    const unreadMessages = (messagesQuery.data?.items || []).filter(
      (message) => message.receiverId === user?.id && !message.readAt
    );

    unreadMessages.forEach((message) => {
      socket.emit("message:read", { conversationId: selectedConversationId, messageId: message.id }, () => {});
    });
  }, [messagesQuery.data?.items, selectedConversationId, user?.id]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content, messageType, attachments, appointment, communicationReport, visitReport }) => {
      if (!socket.connected) {
        return sendConversationMessage({ conversationId, content, messageType, attachments, appointment, communicationReport, visitReport });
      }

      return new Promise((resolve, reject) => {
        socket.emit("message:send", { conversationId, content, messageType, attachments, appointment, communicationReport, visitReport }, (response) => {
          if (!response?.ok) {
            reject(new Error(response?.message || "Message send failed"));
            return;
          }

          resolve(response.data);
        });
      });
    },
    onSuccess: () => {
      setDraftMessage("");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageId, content, messageType, appointment, communicationReport, visitReport }) => {
      if (!socket.connected) {
        return updateConversationMessage({ conversationId, messageId, content, messageType, appointment, communicationReport, visitReport });
      }

      return new Promise((resolve, reject) => {
        socket.emit("message:update", { conversationId, messageId, content, messageType, appointment, communicationReport, visitReport }, (response) => {
          if (!response?.ok) {
            reject(new Error(response?.message || "Message update failed"));
            return;
          }

          resolve(response.data?.message || response.data);
        });
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversationId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-contracts"] }),
        queryClient.invalidateQueries({ queryKey: ["contracts"] }),
        queryClient.invalidateQueries({ queryKey: ["property-contracts"] }),
        queryClient.invalidateQueries({ queryKey: ["managed-properties"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-properties"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-maintenance-properties"] }),
        queryClient.invalidateQueries({ queryKey: ["property-publications"] }),
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-dashboard"] })
      ]);
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageId }) => deleteConversationMessage({ conversationId, messageId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversationId] }),
        queryClient.invalidateQueries({ queryKey: ["conversations-unread"] })
      ]);
    }
  });

  const markReadMutation = useMutation({
    mutationFn: ({ conversationId, messageId }) => markConversationMessageRead({ conversationId, messageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations-unread"] });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: ({ participantId }) => deleteConversationsWithParticipant({ participantId }),
    onSuccess: async () => {
      setSelectedConversationId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations-unread"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation-messages"] })
      ]);
    }
  });

  const uploadConversationAttachmentsMutation = useMutation({
    mutationFn: uploadConversationAttachments
  });

  const selectedConversation = useMemo(
    () => conversationsQuery.data?.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversationsQuery.data, selectedConversationId]
  );

  const handleTypingChange = (value) => {
    setDraftMessage(value);

    if (!selectedConversationId || !socket.connected) {
      return;
    }

    socket.emit(value ? "conversation:typing:start" : "conversation:typing:stop", {
      conversationId: selectedConversationId
    });
  };

  const submitMessage = async () => {
    const content = draftMessage.trim();

    if (!content || !selectedConversationId) {
      return;
    }

    await sendMessageMutation.mutateAsync({ conversationId: selectedConversationId, content });

    if (socket.connected) {
      socket.emit("conversation:typing:stop", { conversationId: selectedConversationId });
    }
  };

  return {
    user,
    onlineUsers,
    typingUserId: typingByConversation[selectedConversationId] || null,
    conversationsQuery,
    unreadCountQuery,
    messagesQuery,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    draftMessage,
    setDraftMessage: handleTypingChange,
    submitMessage,
    sendMessageMutation,
    updateMessageMutation,
    deleteMessageMutation,
    markReadMutation,
    deleteConversationMutation,
    uploadConversationAttachmentsMutation
  };
};
