import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";

export const FavoritesPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Favoris"
      title="Vos biens suivis"
      description="Retrouvez rapidement les annonces que vous souhaitez comparer, revisiter ou reserver."
    />
    <Card>
      <p className="text-sm text-stone-300">Liste des favoris connectee prochainement a l'API backend.</p>
    </Card>
  </section>
);
