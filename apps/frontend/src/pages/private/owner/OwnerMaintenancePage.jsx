import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { OwnerMaintenanceModule } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerMaintenancePage = () => {
  const { t } = useUserPreferences();

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={t("private", "owner.maintenancePage.eyebrow", "Maintenance")}
        title={t("private", "owner.maintenancePage.title", "Interventions, tickets et reparations")}
        description={t("private", "owner.maintenancePage.description", "Suivez les demandes de maintenance, les prestataires mobilises et l'historique technique de chaque bien.")}
      />
      <OwnerMaintenanceModule />
    </section>
  );
};
