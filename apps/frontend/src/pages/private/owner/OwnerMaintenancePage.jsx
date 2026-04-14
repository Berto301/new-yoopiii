import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { OwnerMaintenanceModule } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerMaintenancePage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Maintenance"
      title="Interventions, tickets et reparations"
      description="Suivez les demandes de maintenance, les prestataires mobilises et l'historique technique de chaque bien."
    />
    <OwnerMaintenanceModule />
  </section>
);
