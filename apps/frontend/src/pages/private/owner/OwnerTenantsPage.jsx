import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { OwnerTenantsModule } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerTenantsPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Locataires"
      title="Fiches locataires et historique associe"
      description="Accedez aux identites, contacts, documents, paiements et contrats associes a chaque occupant."
    />
    <OwnerTenantsModule />
  </section>
);
