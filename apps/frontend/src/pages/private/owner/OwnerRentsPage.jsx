import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { OwnerRentsModule } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerRentsPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Loyers"
      title="Suivi des paiements et quittances"
      description="Visualisez les loyers encaisses, detectez les retards et preparez les quittances depuis un espace dedie."
    />
    <OwnerRentsModule />
  </section>
);
