import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { ModalDelete } from "../../components/layout/modals/ModalDelete.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Menu } from "../../components/ui/Menu.jsx";
import { Status } from "../../components/ui/Status.jsx";
import { useNotification } from "../../hooks/useNotification.js";
import { SvgDotsMenu, SvgPlus } from "../../helpers/iconeSvg.js";
import { getManagedProperties } from "../properties/services/property.service.js";
import { ModalManageAppointment } from "./ModalManageAppointment.jsx";
import {
  APPOINTMENT_STATUS,
  buildAppointmentSummary,
  createAppointmentPayload,
  formatParticipantName,
  isAgentRole
} from "./appointment.utils.js";
import { useChatWorkspace } from "./hooks/useChatWorkspace.js";

const extractErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const formatTimestamp = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
};

const renderAppointmentDetails = (appointment) => {
  if (!appointment) {
    return null;
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-100">
          Rendez-vous
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-stone-400">
          {APPOINTMENT_STATUS[appointment.status] || appointment.status || "En attente"}
        </span>
      </div>
      <div className="grid gap-3 text-sm text-stone-200 md:grid-cols-2">
        <p><span className="text-stone-400">Bien :</span> {appointment.propertyTitle || "-"}</p>
        <p><span className="text-stone-400">Date :</span> {appointment.date}</p>
        <p><span className="text-stone-400">Horaire :</span> {appointment.startTime} - {appointment.endTime}</p>
        <p><span className="text-stone-400">Frais :</span> {Number(appointment.visitFee || 0).toLocaleString("fr-FR")} Ar</p>
        <p><span className="text-stone-400">Client prend le bien :</span> {appointment.clientTakesProperty ? "Oui" : "Non"}</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Description</p>
        <p className="text-sm text-white">{appointment.description || "-"}</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Retour client</p>
        <p className="text-sm text-white">{appointment.clientFeedback || "-"}</p>
      </div>
    </div>
  );
};

export const ConversationPanel = () => {
  const {
    user,
    onlineUsers,
    typingUserId,
    conversationsQuery,
    unreadCountQuery,
    messagesQuery,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    draftMessage,
    setDraftMessage,
    submitMessage,
    sendMessageMutation,
    updateMessageMutation,
    deleteMessageMutation,
    deleteConversationMutation
  } = useChatWorkspace();
  const { showError, showInfo, showSuccess } = useNotification();

  const conversations = conversationsQuery.data || [];
  const messages = messagesQuery.data?.items || [];
  const isConversationDisabled = !selectedConversationId;
  const isAgentUser = isAgentRole(user?.role);
  const selectedParticipant = selectedConversation?.participantProfiles?.find((participant) => participant.id !== user?.id) || null;
  const isSelectedParticipantAgent = isAgentRole(selectedParticipant?.role);
  const isAppointmentCreationDisabled = isConversationDisabled || (isAgentUser && isSelectedParticipantAgent);
  const agentParticipant = isAgentUser ? user : selectedParticipant;
  const clientParticipant = isAgentUser ? selectedParticipant : user;
  const appointmentPropertiesQuery = useQuery({
    queryKey: ["chat-appointment-properties", user?.id, user?.role, user?.agencyId],
    queryFn: () =>
      getManagedProperties({
        scope: user?.role === "agency" || user?.role === "agency_agent" ? "agency" : "own",
        page: 1,
        limit: 100
      }),
    enabled: Boolean(isAgentUser && user && selectedConversationId)
  });
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [appointmentModalState, setAppointmentModalState] = useState({
    open: false,
    mode: "create",
    message: null
  });

  const participantStatusItems = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    return (selectedConversation.participantProfiles || [])
      .filter((participant) => participant.id !== user?.id)
      .map((participant) => ({
        id: participant.id,
        label: formatParticipantName(participant),
        avatar: participant.avatar || null,
        role: participant.role,
        isOnline: Boolean(onlineUsers[participant.id])
      }));
  }, [onlineUsers, selectedConversation, user?.id]);

  const appointmentPropertyOptions = useMemo(() => {
    const items = appointmentPropertiesQuery.data?.items || [];
    const mappedItems = items.map((property) => ({
      value: property.id,
      label: property.title,
      purpose: property.purpose
    }));
    const existingProperty = appointmentModalState.message?.appointment?.propertyId
      ? {
          value: appointmentModalState.message.appointment.propertyId,
          label: appointmentModalState.message.appointment.propertyTitle || "Bien selectionne",
          purpose: appointmentModalState.message.appointment.propertyPurpose || null
        }
      : null;

    if (existingProperty && !mappedItems.some((item) => String(item.value) === String(existingProperty.value))) {
      return [existingProperty, ...mappedItems];
    }

    return mappedItems;
  }, [appointmentModalState.message?.appointment, appointmentPropertiesQuery.data?.items]);

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  const openCreateAppointmentModal = () => {
    if (!selectedConversationId) {
      return;
    }

    if (isAgentUser && isSelectedParticipantAgent) {
      showInfo("La prise de rendez-vous est indisponible entre deux agents.");
      return;
    }

    if (!isAgentUser) {
      showInfo("Seul un agent peut initier une prise de rendez-vous.");
      return;
    }

    if (!(appointmentPropertiesQuery.data?.items || []).length) {
      showInfo("Aucun bien disponible pour planifier un rendez-vous.");
      return;
    }

    setAppointmentModalState({
      open: true,
      mode: "create",
      message: null
    });
  };

  const closeAppointmentModal = () => {
    setAppointmentModalState({
      open: false,
      mode: "create",
      message: null
    });
  };

  const startEditingMessage = (message) => {
    if (message.messageType === "appointment") {
      setAppointmentModalState({
        open: true,
        mode: "edit",
        message
      });
      return;
    }

    setEditingMessageId(message.id);
    setEditingMessageContent(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageContent("");
  };

  const saveEditedMessage = async (message) => {
    const trimmedContent = editingMessageContent.trim();

    if (!selectedConversationId || !trimmedContent) {
      return;
    }

    if (trimmedContent === message.content) {
      cancelEditingMessage();
      return;
    }

    await updateMessageMutation.mutateAsync({
      conversationId: selectedConversationId,
      messageId: message.id,
      content: trimmedContent
    });

    cancelEditingMessage();
  };

  const handleAppointmentSubmit = async (values) => {
    if (!selectedConversationId || !selectedParticipant?.id) {
      return;
    }

    const existingAppointment = appointmentModalState.message?.appointment || null;
    const appointmentPayload = createAppointmentPayload({
      values,
      existingAppointment,
      selectedConversation,
      user,
      selectedParticipant,
      isAgent: isAgentUser
    });
    const summary = buildAppointmentSummary(appointmentPayload, {
      agentName: formatParticipantName(agentParticipant),
      clientName: formatParticipantName(clientParticipant)
    });

    try {
      if (appointmentModalState.mode === "edit" && appointmentModalState.message?.id) {
        await updateMessageMutation.mutateAsync({
          conversationId: selectedConversationId,
          messageId: appointmentModalState.message.id,
          content: summary,
          messageType: "appointment",
          appointment: appointmentPayload
        });
        showSuccess("Le rendez-vous a ete mis a jour.");
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId: selectedConversationId,
          content: summary,
          messageType: "appointment",
          appointment: appointmentPayload
        });
        showSuccess("Le rendez-vous a ete envoye dans la conversation.");
      }

      closeAppointmentModal();
    } catch (error) {
      showError(extractErrorMessage(error, "La gestion du rendez-vous a echoue."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.type === "conversation") {
      await deleteConversationMutation.mutateAsync({ participantId: deleteTarget.participantId });
      closeDeleteModal();
      return;
    }

    await deleteMessageMutation.mutateAsync({
      conversationId: selectedConversationId,
      messageId: deleteTarget.messageId
    });
    closeDeleteModal();
  };

  const creationMenuItems = [
    {
      label: "Prise de rendez-vous",
      action: openCreateAppointmentModal,
      disabled: isAppointmentCreationDisabled
    }
  ];

  const conversationMenuItems = [
    {
      label: "Supprimer la conversation",
      action: async () => {
        if (!selectedParticipant?.id || deleteConversationMutation.isPending) {
          return;
        }

        setDeleteTarget({
          type: "conversation",
          participantId: selectedParticipant.id,
          title: "Supprimer la conversation",
          content: `Voulez-vous vraiment supprimer toutes les conversations avec ${formatParticipantName(selectedParticipant)} ? Cette action est irreversible.`
        });
      }
    }
  ];

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-400">Conversations privees</p>
              <p className="mt-1 text-2xl font-semibold text-white">{conversations.length}</p>
            </div>
            <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-brand-100">
              {unreadCountQuery.data?.total ?? 0} non lus
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {conversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId;
              const peers = (conversation.participantProfiles || []).filter((participant) => participant.id !== user?.id);
              const peerNames = peers.map((participant) => formatParticipantName(participant));
              const primaryPeer = peers[0] || null;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={isActive
                    ? "w-full rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4 text-left"
                    : "w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-left hover:border-white/20"
                  }
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={primaryPeer?.avatar}
                      alt={`Photo de ${primaryPeer ? formatParticipantName(primaryPeer) : "participant"}`}
                      name={primaryPeer ? formatParticipantName(primaryPeer) : "Participant"}
                      size="sm"
                      variant="message"
                      type={isAgentRole(primaryPeer?.role) ? "agent" : "user"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{conversation.lastMessagePreview || "Nouvelle conversation"}</p>
                      <p className="mt-1 truncate text-xs text-stone-400">Participants: {peerNames.join(", ") || "-"}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                        {conversation.lastMessageAt ? formatTimestamp(conversation.lastMessageAt) : "Aucun message"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {!conversations.length ? <p className="text-sm text-stone-400">Aucune conversation disponible.</p> : null}
          </div>
        </aside>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="border-b border-white/10 pb-4">
            <p className="text-lg font-semibold text-white">Messagerie privee</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-400">
              {participantStatusItems.length ? participantStatusItems.map((participant) => (
                <span key={participant.id} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  <Avatar
                    src={participant.avatar}
                    alt={`Photo de ${participant.label}`}
                    name={participant.label}
                    size="xs"
                    variant="message"
                    type={isAgentRole(participant.role) ? "agent" : "user"}
                  />
                  <span>{participant.label}</span>
                  <Status color={participant.isOnline ? "#22c55e" : "#ef4444"} />
                  <span>{participant.isOnline ? "en ligne" : "hors ligne"}</span>
                </span>
              )) : <span>Selectionnez une conversation</span>}
            </div>
            {typingUserId ? <p className="mt-2 text-xs text-brand-100">Votre interlocuteur est en train d'ecrire...</p> : null}
          </div>

          <div className="mt-4 space-y-3">
            {messages.map((message) => {
              const isCurrentUser = message.senderId === user?.id;
              const isEditing = editingMessageId === message.id;
              const isAppointmentMessage = message.messageType === "appointment";
              const canEditAppointment = isAppointmentMessage && Boolean(message.appointment);
              const senderProfile = isCurrentUser ? user : selectedParticipant;
              const conversationItemMenuItems = [
                {
                  label: isAppointmentMessage ? "Modifier le rendez-vous" : "Modifier le message",
                  action: async () => {
                    if ((!isCurrentUser && !canEditAppointment) || updateMessageMutation.isPending || !selectedConversationId) {
                      return;
                    }

                    startEditingMessage(message);
                  },
                  disabled: (!isCurrentUser && !canEditAppointment) || (isAppointmentMessage && !message.appointment)
                },
                {
                  label: "Supprimer le message",
                  action: async () => {
                    if (!isCurrentUser || deleteMessageMutation.isPending || !selectedConversationId) {
                      return;
                    }

                    setDeleteTarget({
                      type: "message",
                      messageId: message.id,
                      title: "Supprimer le message",
                      content: "Voulez-vous vraiment supprimer ce message ? Cette action est irreversible."
                    });
                  },
                  disabled: !isCurrentUser
                }
              ];

              return (
                <div key={message.id} className={isCurrentUser ? "ml-auto max-w-xl" : "mr-auto max-w-xl"}>
                  <div className={isCurrentUser ? "flex items-start justify-end gap-3" : "flex items-start gap-3"}>
                    {!isCurrentUser ? (
                      <Avatar
                        src={senderProfile?.avatar}
                        alt={`Photo de ${formatParticipantName(senderProfile)}`}
                        name={formatParticipantName(senderProfile)}
                        size="sm"
                        variant="message"
                        type={isAgentRole(senderProfile?.role) ? "agent" : "user"}
                        className="mt-1"
                      />
                    ) : null}
                    <div className={isCurrentUser ? "rounded-2xl bg-brand-500/20 p-4 text-right" : "rounded-2xl bg-black/20 p-4"}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{formatParticipantName(senderProfile)}</p>
                        <Menu
                          icon={<SvgDotsMenu color="currentColor" />}
                          items={conversationItemMenuItems}
                          disabled={updateMessageMutation.isPending || deleteMessageMutation.isPending}
                          align="right"
                          aria-label="Ouvrir les actions du message"
                        />
                      </div>
                      {isEditing ? (
                        <textarea
                          key={message.id}
                          defaultValue={message.content}
                          className="min-h-24 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
                          onChange={(event) => setEditingMessageContent(event.target.value)}
                          onKeyDown={async (event) => {
                            if (event.key === "Escape") {
                              cancelEditingMessage();
                              return;
                            }

                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              await saveEditedMessage(message);
                            }
                          }}
                          autoFocus
                        />
                      ) : isAppointmentMessage ? renderAppointmentDetails(message.appointment) : (
                        <p className="text-sm text-white">{message.content}</p>
                      )}
                      <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone-400">
                        <span>{message.status}</span>
                        <Status color="#78716c" />
                        <span>{formatTimestamp(message.readAt || message.deliveredAt || message.createdAt)}</span>
                      </div>
                    </div>
                    {isCurrentUser ? (
                      <Avatar
                        src={senderProfile?.avatar}
                        alt={`Photo de ${formatParticipantName(senderProfile)}`}
                        name={formatParticipantName(senderProfile)}
                        size="sm"
                        variant="message"
                        type={isAgentRole(senderProfile?.role) ? "agent" : "user"}
                        className="mt-1"
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
            {!messages.length ? <p className="text-sm text-stone-400">Aucun message dans cette conversation.</p> : null}
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 md:flex-row md:items-end">
            <Menu
              icon={<SvgPlus />}
              items={creationMenuItems}
              disabled={isConversationDisabled}
              aria-label="Ouvrir les actions de creation"
            />

            <div className="flex-1">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-200">Votre message</span>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Ecrivez a votre agent ou a votre client..."
                  disabled={!selectedConversationId || sendMessageMutation.isPending}
                />
              </label>
            </div>

            <Button
              type="button"
              className="px-6"
              disabled={!selectedConversationId || !draftMessage.trim() || sendMessageMutation.isPending}
              onClick={submitMessage}
            >
              Envoyer
            </Button>

            <Menu
              icon={<SvgDotsMenu color="currentColor" />}
              items={conversationMenuItems}
              disabled={isConversationDisabled || deleteConversationMutation.isPending || !selectedParticipant?.id}
              align="right"
              aria-label="Ouvrir les actions de conversation"
            />
          </div>
        </div>
      </section>

      <ModalDelete
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title || "Supprimer"}
        content={deleteTarget?.content || "Est ce que vous aimeriez supprimer le message ?"}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        isDeleting={deleteMessageMutation.isPending || deleteConversationMutation.isPending}
      />

      <ModalManageAppointment
        open={appointmentModalState.open}
        mode={appointmentModalState.mode}
        appointment={appointmentModalState.message?.appointment || null}
        propertyOptions={appointmentPropertyOptions}
        currentUser={user}
        agent={agentParticipant}
        client={clientParticipant}
        isAgent={isAgentUser}
        isSaving={sendMessageMutation.isPending || updateMessageMutation.isPending}
        onClose={closeAppointmentModal}
        onSubmit={handleAppointmentSubmit}
      />
    </>
  );
};
