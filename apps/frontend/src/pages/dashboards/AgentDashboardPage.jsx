import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { AgentDashboardOverview } from "../../features/dashboards/agent/AgentDashboardOverview.jsx";

export const AgentDashboardPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Dashboard agent"
      title="Pilotage commercial"
      description="Suivez vos biens, leads, performances, scoring et activite conversationnelle."
    />
    <AgentDashboardOverview />
  </section>
);
