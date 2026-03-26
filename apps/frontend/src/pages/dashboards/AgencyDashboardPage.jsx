import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { AgencyDashboardOverview } from "../../features/dashboards/agency/AgencyDashboardOverview.jsx";

export const AgencyDashboardPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Dashboard agence"
      title="Supervision agence"
      description="Controlez agents, annonces, planning, depenses et performances globales de votre structure."
    />
    <AgencyDashboardOverview />
  </section>
);
