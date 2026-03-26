import { Card } from "../../../components/ui/Card.jsx";
import { useAgencyDashboard } from "../../agency/hooks/useAgencyDashboard.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0
  }).format(value || 0);

export const AgencyDashboardOverview = () => {
  const { summaryQuery, membersQuery, expensesQuery, eventsQuery } = useAgencyDashboard();
  const summary = summaryQuery.data;

  if (summaryQuery.isLoading) {
    return <Card><p className="text-sm text-stone-300">Chargement du dashboard agence...</p></Card>;
  }

  if (summaryQuery.isError) {
    return <Card><p className="text-sm text-red-300">Le dashboard agence n'a pas pu etre charge.</p></Card>;
  }

  const items = [
    { label: "Agents actifs", value: summary?.activeAgents ?? 0 },
    { label: "Biens actifs", value: summary?.activeProperties ?? 0 },
    { label: "Reservations", value: summary?.totalBookings ?? 0 },
    { label: "Visites a venir", value: summary?.upcomingEvents ?? 0 },
    { label: "Depenses ce mois", value: formatCurrency(summary?.currentMonthExpensesTotal ?? 0) },
    { label: "Depenses en attente", value: summary?.pendingExpenses ?? 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-stone-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-stone-400">Equipe</p>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            {membersQuery.data?.length || 0} membres charges depuis l'API agence.
          </p>
        </Card>
        <Card>
          <p className="text-sm text-stone-400">Evenements du mois</p>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            {eventsQuery.data?.pagination?.total || 0} evenements planifies pour la periode courante.
          </p>
        </Card>
        <Card>
          <p className="text-sm text-stone-400">Depenses</p>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            {expensesQuery.data?.length || 0} lignes de depenses remontees depuis le backend.
          </p>
        </Card>
      </div>

      {summary?.expenseBreakdown?.length ? (
        <Card>
          <p className="text-sm text-stone-400">Repartition des depenses</p>
          <div className="mt-4 space-y-3">
            {summary.expenseBreakdown.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm text-stone-200">
                <span className="capitalize">{item.category}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
};
