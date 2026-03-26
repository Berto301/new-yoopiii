import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";

export const BookingsPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Reservations"
      title="Vos visites et demandes en cours"
      description="Suivez vos demandes de visite, confirmations, reports et historique d'interactions."
    />
    <Card>
      <p className="text-sm text-stone-300">Les reservations utilisateur, agent et agence seront synchronisees ici.</p>
    </Card>
  </section>
);
