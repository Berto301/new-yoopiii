import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { OwnerDashboardOverview } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerDashboardPage = () => {
  const { t } = useUserPreferences();

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={t("private", "owner.dashboardPage.eyebrow", "Dashboard proprietaire")}
        title={t("private", "owner.dashboardPage.title", "Pilotage premium de votre patrimoine")}
        description={t("private", "owner.dashboardPage.description", "Revenus, occupation, retards de loyers, contrats et maintenance regroupes dans une experience claire et professionnelle.")}
      />
      <OwnerDashboardOverview />
    </section>
  );
};
