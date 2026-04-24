import { AuthForm } from "../../features/auth/components/AuthForm.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";

export const RegisterOwnerPage = () => {
  const { t } = useUserPreferences();

  return (
    <AuthForm
      mode="proprietaire"
      title={t("auth", "pages.owner.title", "Creer un compte proprietaire")}
      subtitle={t("auth", "pages.owner.subtitle", "Pilotez vos biens, vos loyers, vos locataires, vos contrats et votre maintenance depuis un espace dedie.")}
    />
  );
};
