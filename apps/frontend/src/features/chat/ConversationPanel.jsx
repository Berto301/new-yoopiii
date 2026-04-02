import { useMemo } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Menu } from "../../components/ui/Menu.jsx";
import { Status } from "../../components/ui/Status.jsx";
import { SvgDotsMenu, SvgPlus } from "../../helpers/iconeSvg.js";
import { useChatWorkspace } from "./hooks/useChatWorkspace.js";

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

const formatParticipantName = (participant) => {
  const fullName = [participant?.firstName, participant?.lastName].filter(Boolean).join(" ").trim();
  return fullName || participant?.email || participant?.id || "-";
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
    deleteConversationMutation
  } = useChatWorkspace();

  const conversations = conversationsQuery.data || [];
  const messages = messagesQuery.data?.items || [];
  const isConversationDisabled = !selectedConversationId;
  const selectedParticipant = selectedConversation?.participantProfiles?.find((participant) => participant.id !== user?.id) || null;

  const participantStatusItems = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    return (selectedConversation.participantProfiles || [])
      .filter((participant) => participant.id !== user?.id)
      .map((participant) => ({
        id: participant.id,
        label: formatParticipantName(participant),
        isOnline: Boolean(onlineUsers[participant.id])
      }));
  }, [onlineUsers, selectedConversation, user?.id]);

  const creationMenuItems = [
    {
      label: "Prise de rendez-vous",
      action: () => {}
    }
  ];

  const conversationMenuItems = [
    {
      label: "Supprimer la conversation",
      action: async () => {
        if (!selectedParticipant?.id || deleteConversationMutation.isPending) {
          return;
        }

        const confirmed = window.confirm(`Supprimer toutes les conversations avec ${formatParticipantName(selectedParticipant)} ?`);

        if (!confirmed) {
          return;
        }

        await deleteConversationMutation.mutateAsync({ participantId: selectedParticipant.id });
      }
    }
  ];

  return (
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
            const peerNames = (conversation.participantProfiles || [])
              .filter((participant) => participant.id !== user?.id)
              .map((participant) => formatParticipantName(participant));

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
                <p className="text-sm font-semibold text-white">{conversation.lastMessagePreview || "Nouvelle conversation"}</p>
                <p className="mt-1 text-xs text-stone-400">Participants: {peerNames.join(", ") || "-"}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                  {conversation.lastMessageAt ? formatTimestamp(conversation.lastMessageAt) : "Aucun message"}
                </p>
              </button>
            );
          })}
          {!conversations.length ? <p className="text-sm text-stone-400">Aucune conversation disponible.</p> : null}
        </div>
      </aside>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="border-b border-white/10 pb-4">
          <p className="text-lg font-semibold text-white">Messagerie privee</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-400">
            {participantStatusItems.length ? participantStatusItems.map((participant) => (
              <span key={participant.id} className="inline-flex items-center gap-2">
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

            return (
              <div
                key={message.id}
                className={isCurrentUser
                  ? "ml-auto max-w-xl rounded-2xl bg-brand-500/20 p-4 text-right"
                  : "mr-auto max-w-xl rounded-2xl bg-black/20 p-4"
                }
              >
                <p className="text-sm text-white">{message.content}</p>
                <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-stone-400">
                  <span>{message.status}</span>
                  <Status color="#78716c" />
                  <span>{formatTimestamp(message.readAt || message.deliveredAt || message.createdAt)}</span>
                </div>
              </div>
            );
          })}
          {!messages.length ? <p className="text-sm text-stone-400">Aucun message dans cette conversation.</p> : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
          <Menu
            icon={<SvgPlus />}
            items={creationMenuItems}
            disabled={isConversationDisabled}
            aria-label="Ouvrir les actions de creation"
          />

          <div className="flex-1">
            <Input
              label="Votre message"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Ecrivez a votre agent ou a votre client..."
              disabled={!selectedConversationId || sendMessageMutation.isPending}
            />
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
  );
};
