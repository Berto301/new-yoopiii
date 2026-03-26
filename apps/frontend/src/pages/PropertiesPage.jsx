import { SectionTitle } from "../components/shared/SectionTitle.jsx";

export const PropertiesPage = () => (
  <section className="mx-auto max-w-7xl px-6 py-20">
    <SectionTitle
      eyebrow="Recherche"
      title="Liste + carte Google Maps"
      description="Cette page accueillera les filtres avances, la geolocalisation par rayon, le clustering et la synchronisation liste-carte."
    />
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-stone-300">
        Zone liste des biens, filtres, pagination et favoris.
      </div>
      <div className="min-h-[420px] rounded-3xl border border-white/10 bg-gradient-to-br from-brand-900/40 to-stone-900 p-6 text-stone-300">
        Zone carte Google Maps et vue 3D si disponible.
      </div>
    </div>
  </section>
);
