import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";

export const NotificationsPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Notifications"
      title="Centre de notifications"
      description="Messages systeme, confirmations de visite, nouvelles annonces et activite commerciale."
    />
    <Card>
      <p className="text-sm text-stone-300">Notifications in-app et push a connecter au backend temps reel.</p>
    </Card>
  </section>
);
