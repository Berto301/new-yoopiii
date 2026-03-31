import { Card } from "../../../components/ui/Card.jsx";
import { useAgencyDashboard } from "../../agency/hooks/useAgencyDashboard.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0
  }).format(value || 0);

export const AgencyDashboardOverview = () => {
  const { summaryQuery, membersQuery, expensesQuery, eventsQuery, propertiesQuery } = useAgencyDashboard();
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
    { label: "Biens publies", value: propertiesQuery.data?.summary?.published ?? 0 },
    { label: "Depenses ce mois", value: formatCurrency(summary?.currentMonthExpensesTotal ?? 0) },
    { label: "En attente publication", value: propertiesQuery.data?.summary?.pendingApproval ?? 0 }
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
          <p className="text-sm text-stone-400">Pipeline biens</p>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            {propertiesQuery.data?.summary?.total || 0} proprietes sous gestion et {propertiesQuery.data?.summary?.totalFavorites || 0} favoris cumules.
          </p>
        </Card>
      </div>

      {propertiesQuery.data?.items?.length ? (
        <Card>
          <p className="text-sm text-stone-400">Derniers mouvements de proprietes</p>
          <div className="mt-4 space-y-3">
            {propertiesQuery.data.items.slice(0, 5).map((property) => (
              <div key={property.id} className="flex items-center justify-between rounded-2xl border border-white/10 p-4 text-sm text-stone-200">
                <span>{property.title}</span>
                <span className="uppercase tracking-[0.2em] text-brand-100">
                  {property.publicationStatus} / {property.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

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
