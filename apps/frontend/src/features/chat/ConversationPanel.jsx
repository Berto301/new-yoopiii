import { useMemo } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
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
    sendMessageMutation
  } = useChatWorkspace();

  const conversations = conversationsQuery.data || [];
  const messages = messagesQuery.data?.items || [];

  const participantsLabel = useMemo(() => {
    if (!selectedConversation) {
      return "Selectionnez une conversation";
    }

    return selectedConversation.participantIds
      .filter((participantId) => participantId !== user?.id)
      .map((participantId) => `${participantId}${onlineUsers[participantId] ? " • en ligne" : " • hors ligne"}`)
      .join(", ");
  }, [onlineUsers, selectedConversation, user?.id]);

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
            const peerIds = conversation.participantIds.filter((participantId) => participantId !== user?.id);

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
                <p className="mt-1 text-xs text-stone-400">Participants: {peerIds.join(", ") || "-"}</p>
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
          <p className="mt-1 text-sm text-stone-400">{participantsLabel}</p>
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
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-stone-400">
                  {message.status} • {formatTimestamp(message.readAt || message.deliveredAt || message.createdAt)}
                </p>
              </div>
            );
          })}
          {!messages.length ? <p className="text-sm text-stone-400">Aucun message dans cette conversation.</p> : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
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
        </div>
      </div>
    </section>
  );
};
