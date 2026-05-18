import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { SettingsTabButton } from "../settings/SettingsTabButton.jsx";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { notifyApiErrors } from "../../../lib/errors/api-error.js";
import { RentPaymentsTable } from "../../../features/owner/RentPaymentsTable.jsx";
import {
  approveOwnerRentPayment,
  generateOwnerPropertyReceipt,
  getOwnerTenantsManagement,
  markOwnerPropertyFeedbackHandled
} from "../../../features/owner/services/owner.service.js";

const statusClassName = {
  handled: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]",
  new: "border-sky-500/25 bg-[var(--info-surface)] text-[var(--info-foreground)]"
};

const StatCard = ({ label, value, help }) => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
    {help ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{help}</p> : null}
  </Card>
);

const InfoBox = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
    <p className="mt-2 break-words text-sm font-medium text-[var(--foreground)]">{value || "-"}</p>
  </div>
);

const downloadReceipt = (payment) => {
  const receiptNumber = payment.receiptNumber || "quittance";
  const content = [
    `Quittance: ${receiptNumber}`,
    `Locataire: ${payment.tenant || "-"}`,
    `Bien: ${payment.property || "-"}`,
    `Echeance: ${payment.dueDateLabel || "-"}`,
    `Montant: ${payment.paidAmountLabel || payment.amountLabel || "-"}`,
    `Statut: ${payment.statusLabel || payment.status || "-"}`
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${receiptNumber}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const OwnerTenantsPage = () => {
  const { t } = useUserPreferences();
  const { showError, showSuccess } = useNotification();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const propertyFilter = searchParams.get("propertyId") || "all";

  const managementQuery = useQuery({
    queryKey: ["owner-tenants-management", propertyFilter],
    queryFn: () => getOwnerTenantsManagement({ propertyId: propertyFilter === "all" ? undefined : propertyFilter })
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["owner-tenants-management"] });
    queryClient.invalidateQueries({ queryKey: ["owner-rents"] });
    queryClient.invalidateQueries({ queryKey: ["owner-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["owner-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const feedbackMutation = useMutation({
    mutationFn: markOwnerPropertyFeedbackHandled,
    onSuccess: () => {
      showSuccess(t("private", "ownerTenantsManagement.feedback.handledSuccess", "Feedback marque comme traite."));
      invalidate();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "ownerTenantsManagement.feedback.handledError", "Impossible de traiter ce feedback.") })
  });

  const receiptMutation = useMutation({
    mutationFn: generateOwnerPropertyReceipt,
    onSuccess: () => {
      showSuccess(t("private", "ownerTenantsManagement.receipts.generated", "Quittance generee et synchronisee."));
      invalidate();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "ownerTenantsManagement.receipts.generateError", "Impossible de generer la quittance.") })
  });

  const approveMutation = useMutation({
    mutationFn: approveOwnerRentPayment,
    onSuccess: () => {
      showSuccess(t("private", "ownerTenantsManagement.receipts.approved", "Paiement approuve et locataire notifie."));
      invalidate();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "ownerTenantsManagement.receipts.approveError", "Impossible d'approuver ce paiement.") })
  });

  const data = managementQuery.data || {};
  const properties = data.properties || [];
  const dashboard = data.dashboard || {};
  const tenants = data.tenants || [];
  const payments = data.payments || [];
  const receipts = data.receipts || [];
  const feedbacks = data.feedbacks || [];

  const filteredTenants = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (statusFilter !== "all" && tenant.contractStatus !== statusFilter) return false;
      if (!query) return true;
      return [tenant.fullName, tenant.email, tenant.phone, tenant.property, tenant.contract].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [searchValue, statusFilter, tenants]);

  const filteredFeedbacks = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return feedbacks.filter((feedback) => {
      if (!query) return true;
      return [feedback.property, feedback.user?.fullName, feedback.user?.email, feedback.subject, feedback.message].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [feedbacks, searchValue]);

  const nextReceiptCandidate = receipts.find((payment) => ["approved", "paid"].includes(payment.status) && !payment.receiptNumber);

  const handlePropertyFilterChange = (value) => {
    if (value === "all") {
      setSearchParams({});
      return;
    }

    setSearchParams({ propertyId: value });
  };

  const handleGenerateReceipt = () => {
    if (!nextReceiptCandidate?.propertyId) return;
    receiptMutation.mutate({ propertyId: nextReceiptCandidate.propertyId, paymentId: nextReceiptCandidate.id });
  };

  return (
    <section className="space-y-8">
      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <SectionTitle
          eyebrow={t("private", "ownerTenantsManagement.eyebrow", "Gestion locataire")}
          title={t("private", "ownerTenantsManagement.title", "Pilotage global des locataires, loyers, quittances et feedbacks")}
          description={t("private", "ownerTenantsManagement.description", "Gerez l'ensemble des biens locatifs depuis une page unique avec filtres par bien, statut et recherche.")}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px_220px]">
        <Input
          label={t("private", "ownerTenantsManagement.filters.search", "Recherche")}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={t("private", "ownerTenantsManagement.filters.searchPlaceholder", "Locataire, bien, contrat...")}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "ownerTenantsManagement.filters.property", "Bien")}</span>
          <select value={propertyFilter} onChange={(event) => handlePropertyFilterChange(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none">
            <option value="all">{t("private", "ownerTenantsManagement.filters.allProperties", "Tous les biens")}</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "ownerTenantsManagement.filters.status", "Statut")}</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none">
            <option value="all">{t("private", "ownerTenantsManagement.filters.allStatuses", "Tous")}</option>
            <option value="active">{t("private", "ownerTenantsManagement.filters.active", "Actif")}</option>
            <option value="signed">{t("private", "ownerTenantsManagement.filters.signed", "Signe")}</option>
            <option value="accepted">{t("private", "ownerTenantsManagement.filters.accepted", "Accepte")}</option>
          </select>
        </label>
      </div>

      <nav className="flex flex-wrap gap-3" aria-label="Owner tenants management tabs">
        <SettingsTabButton active={activeTab === "dashboard"} label={t("private", "ownerTenantsManagement.tabs.dashboard", "Dashboard loyers")} onClick={() => setActiveTab("dashboard")} />
        <SettingsTabButton active={activeTab === "tenants"} label={t("private", "ownerTenantsManagement.tabs.tenants", "Gestion de locataire")} onClick={() => setActiveTab("tenants")} />
        <SettingsTabButton active={activeTab === "receipts"} label={t("private", "ownerTenantsManagement.tabs.receipts", "Quittances")} onClick={() => setActiveTab("receipts")} />
        <SettingsTabButton active={activeTab === "feedback"} label={t("private", "ownerTenantsManagement.tabs.feedback", "Feedback")} onClick={() => setActiveTab("feedback")} />
      </nav>

      {managementQuery.isLoading ? <Card><p className="text-sm text-[var(--muted)]">{t("private", "ownerTenantsManagement.loading", "Chargement de la gestion locative...")}</p></Card> : null}
      {managementQuery.isError ? <Card className="border-red-500/20 bg-[var(--danger-surface)]"><p className="text-sm text-[var(--danger-foreground)]">{t("private", "ownerTenantsManagement.error", "Impossible de charger la gestion locative.")}</p></Card> : null}

      {!managementQuery.isLoading && !managementQuery.isError && activeTab === "dashboard" ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("private", "ownerTenantsManagement.dashboard.expected", "Loyers attendus")} value={dashboard.totalExpectedLabel || "0"} />
            <StatCard label={t("private", "ownerTenantsManagement.dashboard.paid", "Loyers payes")} value={dashboard.totalPaidLabel || "0"} />
            <StatCard label={t("private", "ownerTenantsManagement.dashboard.late", "Loyers en retard")} value={dashboard.totalLateLabel || "0"} />
            <StatCard label={t("private", "ownerTenantsManagement.dashboard.activeTenants", "Locataires actifs")} value={dashboard.activeTenantsCount || 0} help={`${dashboard.activeContractsCount || 0} ${t("private", "ownerTenantsManagement.dashboard.contracts", "contrats actifs")}`} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="border-[var(--border)] bg-[var(--surface)]">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">{t("private", "ownerTenantsManagement.dashboard.upcoming", "Prochains paiements")}</h3>
              <div className="mt-4 space-y-3">
                {(dashboard.upcomingPayments || []).map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <p className="font-medium text-[var(--foreground)]">{payment.tenant} - {payment.property}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{payment.dueDateLabel} - {payment.amountLabel}</p>
                  </div>
                ))}
                {!dashboard.upcomingPayments?.length ? <p className="text-sm text-[var(--muted)]">{t("private", "ownerTenantsManagement.dashboard.noUpcoming", "Aucun paiement en attente.")}</p> : null}
              </div>
            </Card>
            <Card className="border-[var(--border)] bg-[var(--surface)]">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">{t("private", "ownerTenantsManagement.dashboard.alerts", "Alertes de retard")}</h3>
              <div className="mt-4 space-y-3">
                {(dashboard.lateAlerts || []).map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-red-500/25 bg-[var(--danger-surface)] p-4 text-[var(--danger-foreground)]">
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1 text-sm opacity-90">{alert.detail}</p>
                  </div>
                ))}
                {!dashboard.lateAlerts?.length ? <p className="text-sm text-[var(--muted)]">{t("private", "ownerTenantsManagement.dashboard.noAlerts", "Aucun retard actif.")}</p> : null}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {!managementQuery.isLoading && !managementQuery.isError && activeTab === "tenants" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar src={tenant.linkedUser?.avatar} name={tenant.fullName} type="user" />
                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-semibold text-[var(--foreground)]">{tenant.fullName}</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">{tenant.email || tenant.phone || "-"}</p>
                  </div>
                </div>
                <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{tenant.score || 0}/100</Badge>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoBox label={t("private", "ownerTenantsManagement.tenants.contact", "Contact")} value={tenant.contact || tenant.phone || "-"} />
                <InfoBox label={t("private", "ownerTenantsManagement.tenants.property", "Bien associe")} value={tenant.property || "-"} />
                <InfoBox label={t("private", "ownerTenantsManagement.tenants.contract", "Contrat associe")} value={tenant.contract || "-"} />
                <InfoBox label={t("private", "ownerTenantsManagement.tenants.payments", "Historique paiement")} value={tenant.paymentsSummary || "-"} />
              </div>
            </Card>
          ))}
          {!filteredTenants.length ? <Card className="border-dashed border-[var(--border)] text-center"><p className="text-sm text-[var(--muted)]">{t("private", "ownerTenantsManagement.tenants.empty", "Aucun locataire ne correspond aux filtres.")}</p></Card> : null}
        </div>
      ) : null}

      {!managementQuery.isLoading && !managementQuery.isError && activeTab === "receipts" ? (
        <div className="space-y-4">
          <Card className="border-[var(--border)] bg-[var(--surface)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">{t("private", "ownerTenantsManagement.receipts.title", "Gestion des quittances")}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{t("private", "ownerTenantsManagement.receipts.description", "Une quittance peut etre generee uniquement pour un paiement approuve.")}</p>
              </div>
              <Button type="button" disabled={!nextReceiptCandidate || receiptMutation.isPending} onClick={handleGenerateReceipt}>
                {t("private", "ownerTenantsManagement.receipts.generate", "Generer quittance")}
              </Button>
            </div>
          </Card>
          <RentPaymentsTable
            payments={payments}
            showApprove
            isBusy={approveMutation.isPending || receiptMutation.isPending}
            onApprove={(payment) => approveMutation.mutate(payment.id)}
            onDownloadReceipt={downloadReceipt}
            emptyLabel={t("private", "ownerTenantsManagement.receipts.empty", "Aucune quittance ou paiement disponible.")}
          />
        </div>
      ) : null}

      {!managementQuery.isLoading && !managementQuery.isError && activeTab === "feedback" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredFeedbacks.map((feedback) => (
            <Card key={feedback.id} className="border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={statusClassName[feedback.status] || statusClassName.new}>{feedback.status === "handled" ? t("private", "ownerTenantsManagement.feedback.handled", "Traite") : t("private", "ownerTenantsManagement.feedback.new", "Nouveau")}</Badge>
                    <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{feedback.rating}/5</Badge>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{feedback.subject || t("private", "ownerTenantsManagement.feedback.noSubject", "Feedback sans objet")}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{feedback.property} - {feedback.user?.fullName || feedback.user?.email || "-"}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{feedback.createdAtLabel}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{feedback.message}</p>
              {feedback.status !== "handled" ? (
                <div className="mt-5 flex justify-end">
                  <Button type="button" variant="secondary" disabled={feedbackMutation.isPending} onClick={() => feedbackMutation.mutate({ propertyId: feedback.propertyId, feedbackId: feedback.id })}>
                    {t("private", "ownerTenantsManagement.feedback.markHandled", "Marquer comme traite")}
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
          {!filteredFeedbacks.length ? <Card className="border-dashed border-[var(--border)] text-center"><p className="text-sm text-[var(--muted)]">{t("private", "ownerTenantsManagement.feedback.empty", "Aucun feedback ne correspond aux filtres.")}</p></Card> : null}
        </div>
      ) : null}
    </section>
  );
};

export default OwnerTenantsPage;
