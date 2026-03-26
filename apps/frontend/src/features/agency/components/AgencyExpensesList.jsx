import { Card } from "../../../components/ui/Card.jsx";
import { useAgencyDashboard } from "../hooks/useAgencyDashboard.js";

const formatCurrency = (value, currency = "XOF") =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);

export const AgencyExpensesList = () => {
  const { expensesQuery } = useAgencyDashboard();

  if (expensesQuery.isLoading) {
    return <Card><p className="text-sm text-stone-300">Chargement des depenses...</p></Card>;
  }

  if (expensesQuery.isError) {
    return <Card><p className="text-sm text-red-300">Impossible de charger les depenses.</p></Card>;
  }

  return (
    <div className="space-y-4">
      {expensesQuery.data?.map((expense) => (
        <Card key={expense._id || expense.id} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-white">{expense.label}</p>
            <p className="mt-1 text-sm capitalize text-stone-400">{expense.category}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-brand-100">{formatCurrency(expense.amount, expense.currency)}</p>
            <p className="mt-1 text-xs capitalize text-stone-400">{expense.status}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
