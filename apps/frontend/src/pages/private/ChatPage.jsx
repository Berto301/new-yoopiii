import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { ConversationPanel } from "../../features/chat/ConversationPanel.jsx";

export const ChatPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Messagerie"
      title="Discussions privees"
      description="Chat Socket.IO entre clients, agents et agences avec rooms par conversation et notifications live."
    />
    <ConversationPanel />
  </section>
);
