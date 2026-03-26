const cards = [
  { title: "Utilisateur", description: "Favoris, reservations, historique, avis et messages." },
  { title: "Agent independant", description: "Biens, performances, scoring, prospects et agenda." },
  { title: "Agence", description: "Agents, roles, depenses, planning et supervision." },
  { title: "Administrateur", description: "Moderation, controle qualite et gouvernance produit." }
];

export const RoleDashboardGrid = () => (
  <div className="grid gap-6 md:grid-cols-2">
    {cards.map((card) => (
      <article key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-semibold text-white">{card.title}</h3>
        <p className="mt-3 text-sm leading-7 text-stone-300">{card.description}</p>
      </article>
    ))}
  </div>
);
