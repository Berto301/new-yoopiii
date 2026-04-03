import { useSelector } from "react-redux";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { selectCurrentUser } from "../../app/store/session.store.js";
import { AgentDashboardOverview } from "../../features/dashboards/agent/AgentDashboardOverview.jsx";
import { AgencyDashboardOverview } from "../../features/dashboards/agency/AgencyDashboardOverview.jsx";
import { UserDashboardOverview } from "../../features/dashboards/user/UserDashboardOverview.jsx";

const dashboardByRole = {
  user: {
    eyebrow: "Dashboard utilisateur",
    title: "Votre activite immobiliere",
    description: "Vue centralisee des favoris, reservations, discussions, recommandations et prochaines actions.",
    render: () => <UserDashboardOverview />
  },
  independent_agent: {
    eyebrow: "Dashboard agent",
    title: "Pilotage commercial",
    description: "Vue globale de vos biens, rendez-vous, activites recentes et messages a traiter.",
    render: () => <AgentDashboardOverview />
  },
  agency_agent: {
    eyebrow: "Dashboard agent",
    title: "Pilotage commercial",
    description: "Vue globale de vos biens, rendez-vous, activites recentes et messages a traiter.",
    render: () => <AgentDashboardOverview />
  },
  agency: {
    eyebrow: "Dashboard agence",
    title: "Supervision agence",
    description: "Vue globale des biens, de l'equipe, des rendez-vous et des conversations de l'espace agence.",
    render: () => <AgencyDashboardOverview />
  }
};

export const UserDashboardPage = () => {
  const currentUser = useSelector(selectCurrentUser);
  const config = dashboardByRole[currentUser?.role] || dashboardByRole.user;

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
      />
      {config.render()}
    </section>
  );
};
