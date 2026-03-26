import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { UserDashboardOverview } from "../../features/dashboards/user/UserDashboardOverview.jsx";

export const UserDashboardPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Dashboard utilisateur"
      title="Votre activite immobiliere"
      description="Vue centralisee des favoris, reservations, discussions et prochaines actions."
    />
    <UserDashboardOverview />
  </section>
);
