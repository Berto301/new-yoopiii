import { AuthForm } from "../../features/auth/components/AuthForm.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";

export const RegisterIndependentAgentPage = () => {
  const { t } = useUserPreferences();

  return (
    <AuthForm
      mode="independent_agent"
      title={t("auth", "pages.agent.title", "Creer un compte agent independant")}
      subtitle={t("auth", "pages.agent.subtitle", "Publiez vos biens, suivez vos leads, discutez avec vos clients et monitoriez votre scoring.")}
    />
  );
};
