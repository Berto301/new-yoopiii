import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { ConversationPanel } from "../../features/chat/ConversationPanel.jsx";

export const ChatPage = () => {
  const { t } = useUserPreferences();

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={t("private", "messages.eyebrow", "Messagerie")}
        title={t("private", "messages.title", "Discussions privees")}
        description={t("private", "messages.description", "Chat Socket.IO entre clients, agents et agences avec rooms par conversation et notifications live.")}
      />
      <ConversationPanel />
    </section>
  );
};
