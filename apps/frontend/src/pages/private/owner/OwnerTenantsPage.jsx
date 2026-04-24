import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { OwnerTenantsModule } from "../../../features/owner/OwnerWorkspace.jsx";

export const OwnerTenantsPage = () => {
  const { t } = useUserPreferences();

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={t("private", "owner.tenantsPage.eyebrow", "Locataires")}
        title={t("private", "owner.tenantsPage.title", "Fiches locataires et historique associe")}
        description={t("private", "owner.tenantsPage.description", "Accedez aux identites, contacts, documents, paiements et contrats associes a chaque occupant.")}
      />
      <OwnerTenantsModule />
    </section>
  );
};
