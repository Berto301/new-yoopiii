import { AuthForm } from "../../features/auth/components/AuthForm.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";

export const RegisterUserPage = () => {
  const { t } = useUserPreferences();

  return (
    <AuthForm
      mode="user"
      title={t("auth", "pages.user.title", "Creer un compte utilisateur")}
      subtitle={t("auth", "pages.user.subtitle", "Enregistrez vos recherches, suivez vos biens favoris et reservez vos prochaines visites.")}
    />
  );
};
