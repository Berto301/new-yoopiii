import { AuthForm } from "../../features/auth/components/AuthForm.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";

export const LoginPage = () => {
  const { t } = useUserPreferences();

  return (
    <AuthForm
      mode="login"
      title={t("auth", "pages.login.title", "Connexion a votre espace Yopii")}
      subtitle={t("auth", "pages.login.subtitle", "Accedez a vos favoris, conversations, reservations et tableaux de bord selon votre profil.")}
    />
  );
};
