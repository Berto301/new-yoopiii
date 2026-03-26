import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { SearchFilters } from "../../features/search/components/SearchFilters.jsx";
import { SearchResults } from "../../features/search/components/SearchResults.jsx";
import { MapPanel } from "../../features/search/components/MapPanel.jsx";

export const PropertySearchPage = () => (
  <section className="mx-auto max-w-7xl px-6 py-16">
    <SectionTitle
      eyebrow="Recherche immobiliere"
      title="Trouvez un bien par filtres ou par proximite"
      description="Yopii combine recherche liste + carte, geolocalisation par rayon et contextualisation visuelle pour accelerer la prise de decision."
    />
    <div className="mt-10 space-y-6">
      <SearchFilters />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SearchResults />
        <MapPanel />
      </div>
    </div>
  </section>
);
