import { AuthForm } from "../../features/auth/components/AuthForm.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";

export const RegisterAgencyPage = () => {
  const { t } = useUserPreferences();

  return (
    <AuthForm
      mode="agency"
      title={t("auth", "pages.agency.title", "Creer un compte agence")}
      subtitle={t("auth", "pages.agency.subtitle", "Centralisez vos agents, annonces, visites, roles, depenses et performances commerciales.")}
    />
  );
};
