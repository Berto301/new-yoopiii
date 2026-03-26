import { SectionTitle } from "../components/shared/SectionTitle.jsx";
import { ConversationPanel } from "../features/chat/ConversationPanel.jsx";

export const ChatPage = () => (
  <section className="mx-auto max-w-5xl px-6 py-20">
    <SectionTitle
      eyebrow="Temps reel"
      title="Messagerie privee"
      description="Le chat utilisera Socket.IO avec rooms par conversation, presence et notifications temps reel."
    />
    <div className="mt-10">
      <ConversationPanel />
    </div>
  </section>
);
