import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";

const mockProperties = [
  {
    id: "1",
    title: "Villa contemporaine a Cocody",
    price: 145000000,
    distance: "3.2 km"
  },
  {
    id: "2",
    title: "Terrain constructible a Bingerville",
    price: 28500000,
    distance: "8.5 km"
  },
  {
    id: "3",
    title: "Appartement meuble au Plateau",
    price: 900000,
    period: " / mois",
    distance: "5.0 km"
  }
];

export const PropertyListSection = () => {
  const { preferences } = useUserPreferences();

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <SectionTitle
        eyebrow="Decouverte"
        title="Biens mis en avant"
        description="Le frontend est decoupe par fonctionnalites pour accueillir la recherche avancee, la carte Google Maps, la 3D et les parcours de reservation."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {mockProperties.map((property) => (
          <article
            key={property.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
          >
            <div className="mb-6 h-48 rounded-2xl bg-gradient-to-br from-brand-700/50 to-stone-800" />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{property.distance}</p>
              <h3 className="text-xl font-semibold text-white">{property.title}</h3>
              <p className="text-brand-100">{formatMoney(property.price, undefined, preferences)}{property.period || ""}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
