import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import {
  DashboardEmptyState,
  DashboardHero,
  DashboardLoadingState,
  DashboardPanel,
  DashboardStatsGrid
} from "../dashboards/components/DashboardBlocks.jsx";
import { useOwnerWorkspace } from "./hooks/useOwnerWorkspace.js";

const toneClassNames = {
  alert: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  info: "border-sky-400/30 bg-sky-500/10 text-sky-100"
};

const statusClassNames = {
  Actif: "text-emerald-100 bg-emerald-500/10 border-emerald-400/30",
  Archive: "text-stone-200 bg-stone-500/10 border-stone-400/30",
  Brouillon: "text-stone-200 bg-stone-500/10 border-stone-400/30",
  Paye: "text-emerald-100 bg-emerald-500/10 border-emerald-400/30",
  "En retard": "text-rose-100 bg-rose-500/10 border-rose-400/30",
  "En attente": "text-stone-200 bg-stone-500/10 border-stone-400/30",
  Loue: "text-emerald-100 bg-emerald-500/10 border-emerald-400/30",
  Libre: "text-sky-100 bg-sky-500/10 border-sky-400/30",
  "En travaux": "text-amber-100 bg-amber-500/10 border-amber-400/30",
  "En cours": "text-amber-100 bg-amber-500/10 border-amber-400/30",
  Planifie: "text-sky-100 bg-sky-500/10 border-sky-400/30",
  Cloture: "text-emerald-100 bg-emerald-500/10 border-emerald-400/30"
};

const StatusPill = ({ value }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${statusClassNames[value] || "border-white/10 bg-white/5 text-stone-200"}`}>
    {value}
  </span>
);

const DataTable = ({ columns, rows }) => (
  <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-white/5">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-stone-950/40">
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-4 align-top text-sm text-stone-200">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const OwnerDashboardOverview = () => {
  const { dashboardQuery } = useOwnerWorkspace();

  if (dashboardQuery.isLoading) {
    return <DashboardLoadingState label="Chargement du dashboard proprietaire..." />;
  }

  if (dashboardQuery.isError) {
    return <DashboardEmptyState title="Dashboard indisponible" description="Les indicateurs proprietaire n'ont pas pu etre charges pour le moment." />;
  }

  const summary = dashboardQuery.data?.summary || {};
  const stats = [
    {
      label: "Revenus mensuels",
      value: `${Number(summary.monthlyRevenue || 0).toLocaleString("fr-FR")} Ar`,
      helpText: "Encaissements attendus et deja percus sur le mois en cours."
    },
    {
      label: "Taux d'occupation",
      value: `${summary.occupancyRate || 0}%`,
      helpText: "Part de votre portefeuille actuellement occupe par des locataires."
    },
    {
      label: "Loyers en retard",
      value: `${summary.lateRentCount || 0}`,
      helpText: "Paiements a relancer avec une priorite sur les 72 prochaines heures."
    },
    {
      label: "Contrats en cours",
      value: `${summary.activeContractsCount || 0}`,
      helpText: "Baux actifs avec suivi des renouvellements et des echeances."
    }
  ];
  const revenueByProperty = dashboardQuery.data?.revenueByProperty || [];
  const alerts = dashboardQuery.data?.alerts || [];
  const upcomingDeadlines = dashboardQuery.data?.upcomingDeadlines || [];
  const recentMaintenance = dashboardQuery.data?.recentMaintenance || [];

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Patrimoine locatif"
        title="Un cockpit moderne pour piloter vos biens, vos loyers et vos contrats"
        description="Suivez les revenus mensuels, les loyers en retard, les contrats sensibles et la maintenance recente depuis un espace proprietaire pense pour la gestion quotidienne."
        metrics={[
          { label: "Biens", value: summary.propertiesCount || 0 },
          { label: "Locataires", value: summary.tenantsCount || 0 },
          { label: "Tickets", value: summary.maintenanceCount || 0 }
        ]}
      />

      <DashboardStatsGrid items={stats} />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <DashboardPanel
          title="Rendement par bien"
          description="Visualisez les biens les plus performants et ceux qui demandent une action commerciale ou technique."
          badge={`${revenueByProperty.length} biens suivis`}
          action={<Button as={Link} to="/owner/properties" variant="secondary">Ouvrir mes biens</Button>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {revenueByProperty.map((item) => (
              <Card key={item.id} className="border-white/10 bg-stone-950/50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-stone-400">Revenu mensuel: {item.revenue}</p>
                  </div>
                  <StatusPill value={item.status} />
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Rendement</p>
                    <p className="mt-2 text-2xl font-semibold text-amber-100">{item.yield}</p>
                  </div>
                  <div className="h-16 w-24 rounded-2xl bg-[linear-gradient(180deg,rgba(251,191,36,0.2),rgba(15,23,42,0.1))]" />
                </div>
              </Card>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Notifications automatiques"
          description="Alertes prioritaires generees a partir des loyers, baux et besoins de maintenance."
          badge={`${alerts.length} alertes`}
        >
          <div className="space-y-3">
            {alerts.map((item) => (
              <div key={item.id} className={`rounded-[1.5rem] border px-4 py-4 ${toneClassNames[item.tone] || toneClassNames.info}`}>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 opacity-90">{item.detail}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Prochaines echeances"
          description="Baux, paiements et interventions qui exigent une action dans les prochains jours."
          action={<Button as={Link} to="/owner/contracts" variant="secondary">Voir les contrats</Button>}
        >
          <div className="space-y-3">
            {upcomingDeadlines.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-stone-400">{item.date}</p>
                  </div>
                  <Badge className="border-white/10 bg-white/5 text-stone-100">{item.tag}</Badge>
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Maintenance recente"
          description="Interventions terminees, en cours ou planifiees sur l'ensemble du portefeuille."
          action={<Button as={Link} to="/owner/maintenance" variant="secondary">Gerer la maintenance</Button>}
        >
          <div className="space-y-3">
            {recentMaintenance.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-stone-400">{item.property}</p>
                  </div>
                  <StatusPill value={item.status} />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">{item.date}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
};

export const OwnerContractsModule = () => {
  const { contractsQuery } = useOwnerWorkspace();

  if (contractsQuery.isLoading) {
    return <DashboardLoadingState label="Chargement des contrats..." />;
  }

  if (contractsQuery.isError) {
    return <DashboardEmptyState title="Contrats indisponibles" description="Les contrats proprietaire n'ont pas pu etre recuperes." />;
  }

  const contracts = contractsQuery.data || [];

  return (
    <DashboardPanel
      title="Gestion de contrats"
      description="Creation, stockage et supervision des baux ainsi que des contrats de gestion avec agence ou agent independant."
      badge={`${contracts.length} contrats`}
      action={<Button type="button" variant="secondary">Nouveau contrat</Button>}
    >
      <DataTable
        columns={[
          { key: "title", label: "Contrat" },
          { key: "partner", label: "Partenaire" },
          { key: "partnerType", label: "Type" },
          { key: "startDate", label: "Debut" },
          { key: "endDate", label: "Fin" },
          { key: "renewalDate", label: "Renouvellement" },
          { key: "status", label: "Statut", render: (row) => <StatusPill value={row.status} /> }
        ]}
        rows={contracts}
      />
    </DashboardPanel>
  );
};

export const OwnerRentsModule = () => {
  const { rentsQuery } = useOwnerWorkspace();

  if (rentsQuery.isLoading) {
    return <DashboardLoadingState label="Chargement des loyers..." />;
  }

  if (rentsQuery.isError) {
    return <DashboardEmptyState title="Loyers indisponibles" description="Le suivi des loyers n'a pas pu etre charge." />;
  }

  const rents = rentsQuery.data || [];

  return (
    <div className="space-y-4">
      <DashboardPanel
        title="Gestion de loyers"
        description="Suivi des paiements, quittances et alertes de retard sur l'ensemble de vos biens locatifs."
        badge={`${rents.filter((item) => item.status === "En retard").length} retards`}
        action={<Button type="button" variant="secondary">Generer les quittances</Button>}
      >
        <DataTable
          columns={[
            { key: "tenant", label: "Locataire" },
            { key: "property", label: "Bien" },
            { key: "dueDate", label: "Echeance" },
            { key: "amount", label: "Montant" },
            { key: "status", label: "Paiement", render: (row) => <StatusPill value={row.status} /> }
          ]}
          rows={rents}
        />
      </DashboardPanel>
    </div>
  );
};

export const OwnerTenantsModule = () => {
  const { tenantsQuery } = useOwnerWorkspace();

  if (tenantsQuery.isLoading) {
    return <DashboardLoadingState label="Chargement des locataires..." />;
  }

  if (tenantsQuery.isError) {
    return <DashboardEmptyState title="Locataires indisponibles" description="Les fiches locataires n'ont pas pu etre chargees." />;
  }

  const tenants = tenantsQuery.data || [];

  return (
    <DashboardPanel
      title="Gestion des locataires"
      description="Centralisez les fiches locataires, les contacts, les documents, l'historique de paiement et les contrats associes."
      badge={`${tenants.length} locataires`}
      action={<Button type="button" variant="secondary">Nouvelle fiche</Button>}
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="border-white/10 bg-stone-950/50 p-5">
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-white">{tenant.fullName}</p>
                <p className="mt-1 text-sm text-stone-400">{tenant.contact}</p>
              </div>
              <div className="space-y-2 text-sm text-stone-300">
                <p><span className="text-stone-500">Identite:</span> {tenant.identity}</p>
                <p><span className="text-stone-500">Documents:</span> {tenant.documents}</p>
                <p><span className="text-stone-500">Historique:</span> {tenant.paymentHistory}</p>
                <p><span className="text-stone-500">Contrat:</span> {tenant.contract}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardPanel>
  );
};

export const OwnerPropertiesModule = () => {
  const { propertiesQuery } = useOwnerWorkspace();

  if (propertiesQuery.isLoading) {
    return <DashboardLoadingState label="Chargement des biens..." />;
  }

  if (propertiesQuery.isError) {
    return <DashboardEmptyState title="Biens indisponibles" description="Le portefeuille immobilier n'a pas pu etre charge." />;
  }

  const properties = propertiesQuery.data || [];

  return (
    <DashboardPanel
      title="Mes biens"
      description="Suivi du portefeuille proprietaire avec surface, localisation, photos, statut et historique d'occupation."
      badge={`${properties.length} biens`}
      action={<Button type="button" variant="secondary">Ajouter un bien</Button>}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {properties.map((property) => (
          <Card key={property.id} className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-0">
            <div className="h-32 bg-[linear-gradient(135deg,rgba(15,23,42,0.25),rgba(51,65,85,0.55),rgba(14,116,144,0.3))]" />
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{property.title}</p>
                  <p className="mt-1 text-sm text-stone-300">{property.location}</p>
                </div>
                <StatusPill value={property.status} />
              </div>
              <div className="grid gap-3 text-sm text-stone-300 sm:grid-cols-3">
                <p><span className="text-stone-500">Surface:</span> {property.surface}</p>
                <p><span className="text-stone-500">Photos:</span> {property.photos}</p>
                <p><span className="text-stone-500">Historique:</span> {property.history}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardPanel>
  );
};

export const OwnerMaintenanceModule = () => {
  const { maintenanceQuery } = useOwnerWorkspace();

  if (maintenanceQuery.isLoading) {
    return <DashboardLoadingState label="Chargement de la maintenance..." />;
  }

  if (maintenanceQuery.isError) {
    return <DashboardEmptyState title="Maintenance indisponible" description="Les tickets de maintenance n'ont pas pu etre charges." />;
  }

  const maintenance = maintenanceQuery.data || [];

  return (
    <DashboardPanel
      title="Gestion de maintenance"
      description="Tickets, interventions planifiees et historique des reparations pour chaque bien."
      badge={`${maintenance.length} tickets`}
      action={<Button type="button" variant="secondary">Nouveau ticket</Button>}
    >
      {maintenance.length ? (
        <DataTable
          columns={[
            { key: "title", label: "Ticket" },
            { key: "property", label: "Bien" },
            { key: "priority", label: "Priorite" },
            { key: "assignee", label: "Intervenant" },
            { key: "lastUpdate", label: "Derniere mise a jour" },
            { key: "status", label: "Statut", render: (row) => <StatusPill value={row.status} /> }
          ]}
          rows={maintenance}
        />
      ) : (
        <DashboardEmptyState
          title="Aucun ticket de maintenance"
          description="Les demandes techniques et leur suivi apparaitront ici des qu'elles seront enregistrees."
        />
      )}
    </DashboardPanel>
  );
};
