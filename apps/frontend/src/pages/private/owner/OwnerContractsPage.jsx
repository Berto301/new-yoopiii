import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { OwnerContractsModule } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerContractsPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Contrats"
      title="Gestion des baux et mandats"
      description="Creez, stockez et suivez les contrats lies a vos biens, a vos agences partenaires et a vos agents independants."
    />
    <OwnerContractsModule />
  </section>
);
