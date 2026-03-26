import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { AgencyExpensesList } from "../../features/agency/components/AgencyExpensesList.jsx";

export const AgencyExpensesPage = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Depenses agence"
      title="Suivi des depenses"
      description="Liste connectee au backend pour suivre les lignes de couts, les validations et les categories budgetaires."
    />
    <AgencyExpensesList />
  </section>
);
