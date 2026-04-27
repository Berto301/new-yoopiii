import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { OwnerExpensesModule } from "../../../features/owner/OwnerExpensesModule.jsx";

export const OwnerExpensesPage = () => {
  const { t } = useUserPreferences();

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={t("private", "owner.expensesPage.eyebrow", "Depenses")}
        title={t("private", "owner.expensesPage.title", "Gestion des depenses")}
        description={t("private", "owner.expensesPage.description", "Analysez les revenus, les charges, la maintenance et la balance nette de votre portefeuille.")}
      />
      <OwnerExpensesModule />
    </section>
  );
};
