import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";

export const AgentScoringPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Scoring"
      title="Performance et classement agent"
      description="Mesurez la qualite commerciale via reactivite, conversions, notes et volume d'activite."
    />
    <Card>
      <p className="text-sm text-stone-300">Les cartes de scoring et statistiques seront alimentees par TanStack Query.</p>
    </Card>
  </section>
);
