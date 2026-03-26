const messages = [
  { id: "1", author: "Client", content: "Bonjour, la villa est-elle toujours disponible ?" },
  { id: "2", author: "Agent", content: "Oui, une visite est possible demain a 15h." }
];

export const ConversationPanel = () => (
  <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="rounded-2xl bg-black/20 p-4">
          <p className="text-sm font-medium text-brand-100">{message.author}</p>
          <p className="mt-2 text-sm text-stone-200">{message.content}</p>
        </div>
      ))}
    </div>
  </section>
);
