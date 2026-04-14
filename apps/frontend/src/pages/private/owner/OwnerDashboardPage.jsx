import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { OwnerDashboardOverview } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerDashboardPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Dashboard proprietaire"
      title="Pilotage premium de votre patrimoine"
      description="Revenus, occupation, retards de loyers, contrats et maintenance regroupes dans une experience claire et professionnelle."
    />
    <OwnerDashboardOverview />
  </section>
);
