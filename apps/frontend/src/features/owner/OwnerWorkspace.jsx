import { jsPDF } from "jspdf";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { useNotification } from "../../hooks/useNotification.js";
import { notifyApiErrors } from "../../lib/errors/api-error.js";
import {
  DashboardEmptyState,
  DashboardHero,
  DashboardLoadingState,
  DashboardPanel,
  DashboardStatsGrid
} from "../dashboards/components/DashboardBlocks.jsx";
import { useBookingsWorkspace } from "../bookings/hooks/useBookingsWorkspace.js";
import { useOwnerWorkspace } from "./hooks/useOwnerWorkspace.js";
import { ModalDeleteTicket } from "../../pages/private/owner/ModalDeleteTicket.jsx";
import { ModalManageLocataire } from "../../pages/private/owner/ModalManageLocataire.jsx";
import { ModalManageTicket } from "../../pages/private/owner/ModalManageTicket.jsx";
import { ModalDelete } from "../../components/layout/modals/ModalDelete.jsx";

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
  const { tenantsQuery, managedPropertiesQuery, createTenantMutation, updateTenantMutation, deleteTenantMutation } = useOwnerWorkspace();
  const { bookingsQuery } = useBookingsWorkspace();
  const { showError, showSuccess } = useNotification();
  const [modalState, setModalState] = useState({ open: false, mode: "create", tenant: null });
  const [deleteModalState, setDeleteModalState] = useState({ open: false, tenant: null });
  const [searchValue, setSearchValue] = useState("");
  const [propertyFilterValue, setPropertyFilterValue] = useState("all");
  const tenants = tenantsQuery.data || [];

  const propertyOptions = useMemo(
    () =>
      (managedPropertiesQuery.data || [])
        .filter((property) => property.purpose === "rent")
        .map((property) => ({
          value: property.id,
          label: property.title,
          contractLabel: property.managementContractId ? `Contrat ${property.managementContractId}` : "Aucun contrat associe",
          managementContractId: property.managementContractId || null
        })),
    [managedPropertiesQuery.data]
  );

  const userOptions = useMemo(() => {
    const entries = new Map();

    tenants.forEach((tenant) => {
      if (!tenant.linkedUserId) {
        return;
      }

      entries.set(String(tenant.linkedUserId), {
        value: String(tenant.linkedUserId),
        label: `${tenant.fullName}${tenant.email ? ` • ${tenant.email}` : ""}`
      });
    });

    (bookingsQuery.data || [])
      .filter((booking) => booking.property?.purpose === "rent" && booking.customer)
      .forEach((booking) => {
        const customer = booking.customer;
        const customerId = customer.id || customer._id;

        if (!customerId || entries.has(String(customerId))) {
          return;
        }

        entries.set(String(customerId), {
          value: String(customerId),
          label: `${[customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email || "Utilisateur"}${customer.email ? ` • ${customer.email}` : ""}`
        });
      });

    return [...entries.values()];
  }, [bookingsQuery.data, tenants]);

  const propertyFilterOptions = useMemo(
    () => [{ value: "all", label: "Tous les biens" }, ...propertyOptions],
    [propertyOptions]
  );

  const filteredTenants = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const matchesProperty = propertyFilterValue === "all" || tenant.managedPropertyId === propertyFilterValue;
      const matchesSearch = !normalizedSearch
        || tenant.fullName?.toLowerCase().includes(normalizedSearch)
        || tenant.cin?.toLowerCase().includes(normalizedSearch)
        || tenant.identity?.toLowerCase().includes(normalizedSearch);

      return matchesProperty && matchesSearch;
    });
  }, [propertyFilterValue, searchValue, tenants]);

  if (tenantsQuery.isLoading) {
    return <DashboardLoadingState label="Chargement des locataires..." />;
  }

  if (tenantsQuery.isError) {
    return <DashboardEmptyState title="Locataires indisponibles" description="Les fiches locataires n'ont pas pu etre chargees." />;
  }

  const handleSubmitTenant = async (payload) => {
    try {
      if (modalState.mode === "edit" && modalState.tenant) {
        await updateTenantMutation.mutateAsync({
          tenantId: modalState.tenant.id,
          payload
        });
        showSuccess("Locataire mis a jour.");
      } else {
        await createTenantMutation.mutateAsync(payload);
        showSuccess("Locataire cree.");
      }

      setModalState({ open: false, mode: "create", tenant: null });
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La gestion du locataire a echoue." });
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteModalState.tenant) {
      return;
    }

    try {
      await deleteTenantMutation.mutateAsync(deleteModalState.tenant.id);
      setDeleteModalState({ open: false, tenant: null });
      showSuccess("Locataire supprime et bien libere.");
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La suppression du locataire a echoue." });
    }
  };

  const handleDownloadTenantSheet = (tenant) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 56, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Yoopii", 18, 18);
    doc.setFontSize(24);
    doc.text("Fiche locataire", 18, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Export proprietaire", 18, 40);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 66, 182, 58, 10, 10, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 66, 182, 58, 10, 10, "S");

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Nom complet", 24, 82);
    doc.text("Bien associe", 24, 100);
    doc.text("Contrat", 24, 118);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(17);
    doc.text(tenant.fullName || "-", 24, 89);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(tenant.property || "-", 24, 107);
    doc.text(tenant.contract || "-", 24, 125);

    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Coordonnees", 18, 145);
    doc.roundedRect(14, 151, 182, 58, 10, 10, "S");
    doc.setFont("helvetica", "normal");
    doc.text([
      `Email : ${tenant.email || "-"}`,
      `Telephone : ${tenant.phone || "-"}`,
      `CIN : ${tenant.cin || tenant.identity || "-"}`,
      `Sexe : ${tenant.sexeLabel || "-"}`,
      `Adresse : ${tenant.adresse || "-"}`
    ], 22, 164, { maxWidth: 166 });

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.text(`Genere le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`, 18, 286);

    const fileName = `fiche-locataire-${String(tenant.fullName || "profil")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "profil"}.pdf`;

    doc.save(fileName);
  };

  return (
    <>
      <DashboardPanel
        title="Gestion des locataires"
        description="Centralisez les fiches locataires avec un visuel plus propre, des filtres rapides et des actions de gestion completes."
        badge={`${filteredTenants.length} / ${tenants.length} locataires`}
        action={
          <Button type="button" variant="secondary" disabled={!propertyOptions.length} onClick={() => setModalState({ open: true, mode: "create", tenant: null })}>
            Nouvelle fiche
          </Button>
        }
      >
        <div className="mb-5 grid gap-4 rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 lg:grid-cols-[1fr_280px]">
          <Input
            label="Recherche par nom ou CIN"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Ex: Sarah, Mickael, CIN-001..."
          />
          <div className="space-y-2">
            <span className="text-sm font-medium text-stone-200">Filtrer par bien</span>
            <select
              value={propertyFilterValue}
              onChange={(event) => setPropertyFilterValue(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
            >
              {propertyFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-0">
              <div className="border-b border-white/10 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Badge className="border-white/10 bg-black/20 text-stone-200">{tenant.property || "Bien non renseigne"}</Badge>
                    <div>
                      <p className="text-lg font-semibold text-white">{tenant.fullName}</p>
                      <p className="mt-1 text-sm text-stone-400">{tenant.email || tenant.contact}</p>
                    </div>
                  </div>
                  <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">{tenant.sexeLabel}</Badge>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Telephone</p>
                    <p className="mt-2 text-sm text-white">{tenant.phone || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">CIN</p>
                    <p className="mt-2 text-sm text-white">{tenant.cin || tenant.identity || "-"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Adresse</p>
                  <p className="mt-2 text-sm text-stone-300">{tenant.adresse || "-"}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Contrat</p>
                    <p className="mt-2 text-sm text-white">{tenant.contract}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Source</p>
                    <p className="mt-2 text-sm text-white">{tenant.source === "booking_closed_won" ? "Depuis rendez-vous" : "Manuel"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={() => setModalState({ open: true, mode: "edit", tenant })}>
                    Modifier
                  </Button>
                  <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={() => handleDownloadTenantSheet(tenant)}>
                    Telecharger la fiche
                  </Button>
                  <Button type="button" variant="ghost" className="px-3 py-2 text-xs text-red-200" onClick={() => setDeleteModalState({ open: true, tenant })}>
                    Supprimer
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {!filteredTenants.length ? (
          <DashboardEmptyState
            title="Aucun locataire trouve"
            description="Ajustez les filtres par bien, nom ou CIN pour retrouver rapidement une fiche."
          />
        ) : null}
        {!propertyOptions.length && !managedPropertiesQuery.isLoading ? (
          <p className="mt-4 text-sm text-stone-400">
            Aucun bien en location n'est disponible pour rattacher un locataire.
          </p>
        ) : null}
      </DashboardPanel>

      <ModalManageLocataire
        open={modalState.open}
        mode={modalState.mode}
        tenant={modalState.tenant}
        propertyOptions={propertyOptions}
        userOptions={userOptions}
        onClose={() => setModalState({ open: false, mode: "create", tenant: null })}
        onSubmit={handleSubmitTenant}
        isSaving={createTenantMutation.isPending || updateTenantMutation.isPending}
      />
      <ModalDelete
        open={deleteModalState.open}
        title="Supprimer le locataire"
        content={`Voulez-vous vraiment supprimer la fiche de ${deleteModalState.tenant?.fullName || "ce locataire"} ? Le bien associe sera libere et redeviendra disponible.`}
        onClose={() => setDeleteModalState({ open: false, tenant: null })}
        onConfirm={handleDeleteTenant}
        isDeleting={deleteTenantMutation.isPending}
      />
    </>
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
  const {
    maintenanceQuery,
    managedPropertiesQuery,
    createMaintenanceTicketMutation,
    updateMaintenanceTicketMutation,
    deleteMaintenanceTicketMutation
  } = useOwnerWorkspace();
  const { showError, showSuccess } = useNotification();
  const [modalState, setModalState] = useState({ open: false, mode: "create", ticket: null });
  const [deleteModalState, setDeleteModalState] = useState({ open: false, ticket: null });
  const propertyOptions = useMemo(
    () =>
      (managedPropertiesQuery.data || []).map((property) => ({
        value: property.id,
        label: property.title,
        type: property.type
      })),
    [managedPropertiesQuery.data]
  );

  if (maintenanceQuery.isLoading) {
    return <DashboardLoadingState label="Chargement de la maintenance..." />;
  }

  if (maintenanceQuery.isError) {
    return <DashboardEmptyState title="Maintenance indisponible" description="Les tickets de maintenance n'ont pas pu etre charges." />;
  }

  const maintenance = maintenanceQuery.data || [];

  const handleSubmitTicket = async (payload) => {
    try {
      if (modalState.mode === "edit" && modalState.ticket) {
        await updateMaintenanceTicketMutation.mutateAsync({
          ticketId: modalState.ticket.id,
          payload
        });
        showSuccess("Ticket de maintenance mis a jour.");
      } else {
        await createMaintenanceTicketMutation.mutateAsync(payload);
        showSuccess("Ticket de maintenance cree.");
      }

      setModalState({ open: false, mode: "create", ticket: null });
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La gestion du ticket a echoue." });
    }
  };

  const handleDeleteTicket = async () => {
    if (!deleteModalState.ticket) return;

    try {
      await deleteMaintenanceTicketMutation.mutateAsync(deleteModalState.ticket.id);
      setDeleteModalState({ open: false, ticket: null });
      showSuccess("Ticket de maintenance supprime.");
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La suppression du ticket a echoue." });
    }
  };

  return (
    <>
      <DashboardPanel
        title="Gestion de maintenance"
        description="Tickets, interventions planifiees et historique des reparations pour chaque bien."
        badge={`${maintenance.length} tickets`}
        action={
          <Button
            type="button"
            variant="secondary"
            disabled={managedPropertiesQuery.isLoading || !propertyOptions.length}
            onClick={() => setModalState({ open: true, mode: "create", ticket: null })}
          >
            Nouveau ticket
          </Button>
        }
      >
        {maintenance.length ? (
          <DataTable
            columns={[
              { key: "title", label: "Ticket" },
              { key: "property", label: "Bien" },
              { key: "priority", label: "Priorite" },
              { key: "assignee", label: "Intervenant" },
              { key: "lastUpdate", label: "Derniere mise a jour" },
              { key: "status", label: "Statut", render: (row) => <StatusPill value={row.status} /> },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={() => setModalState({ open: true, mode: "edit", ticket: row })}>
                      Modifier
                    </Button>
                    <Button type="button" variant="ghost" className="px-3 py-2 text-xs text-red-200" onClick={() => setDeleteModalState({ open: true, ticket: row })}>
                      Supprimer
                    </Button>
                  </div>
                )
              }
            ]}
            rows={maintenance}
          />
        ) : (
          <DashboardEmptyState
            title="Aucun ticket de maintenance"
            description="Les demandes techniques et leur suivi apparaitront ici des qu'elles seront enregistrees."
          />
        )}
        {!propertyOptions.length && !managedPropertiesQuery.isLoading ? (
          <p className="mt-4 text-sm text-stone-400">
            Aucun bien gere n'est disponible pour ouvrir un ticket de maintenance.
          </p>
        ) : null}
      </DashboardPanel>

      <ModalManageTicket
        open={modalState.open}
        mode={modalState.mode}
        ticket={modalState.ticket}
        propertyOptions={propertyOptions}
        onClose={() => setModalState({ open: false, mode: "create", ticket: null })}
        onSubmit={handleSubmitTicket}
        isSaving={createMaintenanceTicketMutation.isPending || updateMaintenanceTicketMutation.isPending}
      />
      <ModalDeleteTicket
        open={deleteModalState.open}
        ticket={deleteModalState.ticket}
        onClose={() => setDeleteModalState({ open: false, ticket: null })}
        onConfirm={handleDeleteTicket}
        isDeleting={deleteMaintenanceTicketMutation.isPending}
      />
    </>
  );
};
