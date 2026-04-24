import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { OwnerRentsModule } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerRentsPage = () => {
  const { t } = useUserPreferences();

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={t("private", "owner.rentsPage.eyebrow", "Loyers")}
        title={t("private", "owner.rentsPage.title", "Suivi des paiements et quittances")}
        description={t("private", "owner.rentsPage.description", "Visualisez les loyers encaisses, detectez les retards et preparez les quittances depuis un espace dedie.")}
      />
      <OwnerRentsModule />
    </section>
  );
};
