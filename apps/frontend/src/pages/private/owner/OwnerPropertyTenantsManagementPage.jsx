import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { formatMoney } from "../../../app/preferences/user-preferences.utils.js";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { ScoreBadge } from "../../../components/ui/ScoreBadge.jsx";
import { createConversation } from "../../../features/chat/services/chat.service.js";
import {
  generateOwnerPropertyReceipt,
  getOwnerPropertyTenancy,
  markOwnerPropertyFeedbackHandled
} from "../../../features/owner/services/owner.service.js";
import { useNotification } from "../../../hooks/useNotification.js";
import { notifyApiErrors } from "../../../lib/errors/api-error.js";
import { SettingsTabButton } from "../settings/SettingsTabButton.jsx";

const replaceTemplate = (template, values = {}) =>
  Object.entries(values).reduce(
    (currentValue, [key, value]) => currentValue.replaceAll(`{${key}}`, String(value)),
    template
  );

const paymentStatusClassName = {
  approved: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]",
  paid: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]",
  late: "border-red-500/25 bg-[var(--danger-surface)] text-[var(--danger-foreground)]",
  pending: "border-amber-500/25 bg-[var(--warning-surface)] text-[var(--warning-foreground)]",
  pending_approval: "border-amber-500/25 bg-[var(--warning-surface)] text-[var(--warning-foreground)]",
  rejected: "border-red-500/25 bg-[var(--danger-surface)] text-[var(--danger-foreground)]",
  cancelled: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
};

const feedbackStatusClassName = {
  handled: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]",
  new: "border-sky-500/25 bg-[var(--info-surface)] text-[var(--info-foreground)]"
};

const PaymentStatusBadge = ({ status }) => {
  const { t } = useUserPreferences();
  const labels = {
    approved: t("private", "ownerPropertyTenancy.status.approved", "Approuve"),
    paid: t("private", "ownerPropertyTenancy.status.paid", "Paye"),
    late: t("private", "ownerPropertyTenancy.status.late", "En retard"),
    pending: t("private", "ownerPropertyTenancy.status.pending", "En attente"),
    pending_approval: t("private", "ownerPropertyTenancy.status.pendingApproval", "En attente d'approbation"),
    rejected: t("private", "ownerPropertyTenancy.status.rejected", "Rejete"),
    cancelled: t("private", "ownerPropertyTenancy.status.cancelled", "Annule")
  };

  return <Badge className={paymentStatusClassName[status] || paymentStatusClassName.pending}>{labels[status] || status}</Badge>;
};

const StatTile = ({ label, value, help }) => (
  <Card className="border-[var(--border)] bg-[var(--surface)] p-5 shadow-none">
    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
    {help ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{help}</p> : null}
  </Card>
);

const downloadReceiptText = ({ receipt, propertyTitle, t }) => {
  const receiptNumber = receipt.receiptNumber || "quittance";
  const content = [
    replaceTemplate(t("private", "ownerPropertyTenancy.receipts.fileTitle", "Quittance {number}"), { number: receiptNumber }),
    t("private", "ownerPropertyTenancy.receipts.fileProof", "Preuve: paiement deja effectue"),
    replaceTemplate(t("private", "ownerPropertyTenancy.receipts.fileProperty", "Bien: {property}"), { property: propertyTitle || "-" }),
    replaceTemplate(t("private", "ownerPropertyTenancy.receipts.fileTenant", "Locataire: {tenant}"), { tenant: receipt.tenant || "-" }),
    replaceTemplate(t("private", "ownerPropertyTenancy.receipts.fileAmount", "Montant: {amount}"), { amount: receipt.amountLabel || "-" }),
    replaceTemplate(t("private", "ownerPropertyTenancy.receipts.fileDueDate", "Echeance: {date}"), { date: receipt.dueDateLabel || "-" }),
    replaceTemplate(t("private", "ownerPropertyTenancy.receipts.fileStatus", "Statut: {status}"), { status: receipt.status || "-" })
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${receiptNumber}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const OwnerPropertyTenantsManagementPage = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, preferences } = useUserPreferences();
  const { showError, showSuccess } = useNotification();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tenantSearch, setTenantSearch] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackPeriod, setFeedbackPeriod] = useState("all");

  const tenancyQuery = useQuery({
    queryKey: ["owner-property-tenancy", propertyId],
    queryFn: () => getOwnerPropertyTenancy(propertyId),
    enabled: Boolean(propertyId)
  });

  const invalidateWorkspace = () => {
    queryClient.invalidateQueries({ queryKey: ["owner-property-tenancy", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["owner-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["owner-rents"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const receiptMutation = useMutation({
    mutationFn: generateOwnerPropertyReceipt,
    onSuccess: () => {
      showSuccess(t("private", "ownerPropertyTenancy.messages.receiptSuccess", "Quittance generee et locataire notifie."));
      invalidateWorkspace();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "ownerPropertyTenancy.messages.receiptError", "Impossible de generer la quittance.") })
  });

  const feedbackMutation = useMutation({
    mutationFn: markOwnerPropertyFeedbackHandled,
    onSuccess: () => {
      showSuccess(t("private", "ownerPropertyTenancy.messages.feedbackHandled", "Feedback marque comme traite."));
      invalidateWorkspace();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "ownerPropertyTenancy.messages.feedbackError", "Impossible de traiter ce feedback.") })
  });

  const data = tenancyQuery.data || {};
  const property = data.property || {};
  const tenants = data.tenants || [];
  const receipts = data.receipts || [];
  const feedbacks = data.feedbacks || [];
  const dashboard = data.dashboard || {};

  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    if (!query) return tenants;

    return tenants.filter((tenant) =>
      [tenant.fullName, tenant.email, tenant.phone, tenant.cin, tenant.contract]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [tenantSearch, tenants]);

  const filteredFeedbacks = useMemo(() => {
    const query = feedbackSearch.trim().toLowerCase();
    const periodDays = feedbackPeriod === "all" ? null : Number(feedbackPeriod);
    const minDate = periodDays ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : null;

    return feedbacks.filter((feedback) => {
      const matchesSearch = !query || [feedback.subject, feedback.message, feedback.user?.fullName, feedback.user?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const matchesPeriod = !minDate || (feedback.createdAt && new Date(feedback.createdAt) >= minDate);

      return matchesSearch && matchesPeriod;
    });
  }, [feedbackPeriod, feedbackSearch, feedbacks]);

  const handleContactTenant = async (tenant) => {
    const participantId = tenant.linkedUser?.id || tenant.linkedUserId;

    if (!participantId) {
      showError(t("private", "ownerPropertyTenancy.messages.contactUnavailable", "Ce locataire n'a pas encore de compte utilisateur lie."));
      return;
    }

    try {
      const conversation = await createConversation({ participantId, propertyId });
      navigate(`/messages?conversationId=${conversation.id}`);
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: t("private", "ownerPropertyTenancy.messages.contactError", "Impossible d'ouvrir la conversation.") });
    }
  };

  const handleGenerateReceipt = (paymentId) => {
    receiptMutation.mutate({ propertyId, paymentId });
  };

  const handleDownloadReceipt = async (receipt) => {
    try {
      const currentReceipt = receipt.receiptNumber
        ? receipt
        : await receiptMutation.mutateAsync({ propertyId, paymentId: receipt.id });

      downloadReceiptText({ receipt: currentReceipt, propertyTitle: property.title, t });
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: t("private", "ownerPropertyTenancy.messages.downloadError", "Impossible de telecharger la quittance.") });
    }
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => navigate("/owner/properties")}>
          {t("private", "common.back", "Retour")}
        </Button>
      </div>

      <Card className="overflow-hidden border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_26%),var(--surface)] p-0">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <SectionTitle
            eyebrow={t("private", "ownerPropertyTenancy.eyebrow", "Gestion locataires")}
            title={property.title || t("private", "ownerPropertyTenancy.title", "Gestion des locataires du bien")}
            description={t("private", "ownerPropertyTenancy.description", "Pilotez les loyers, les locataires, les quittances et les feedbacks uniquement pour le bien selectionne.")}
          />
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.property", "Bien")}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{property.address || t("private", "ownerPropertyTenancy.addressMissing", "Adresse non renseignee")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {property.status ? <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{property.status}</Badge> : null}
              {property.purpose ? <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{property.purpose}</Badge> : null}
              <ScoreBadge score={property.score || 0} showScore />
            </div>
          </div>
        </div>
      </Card>

      {tenancyQuery.isLoading ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("private", "ownerPropertyTenancy.loading", "Chargement de la gestion locataires...")}</p>
        </Card>
      ) : null}

      {tenancyQuery.isError ? (
        <Card className="border-red-500/20 bg-[var(--danger-surface)]">
          <p className="text-sm text-[var(--danger-foreground)]">{t("private", "ownerPropertyTenancy.error", "Impossible de charger cette gestion locataires.")}</p>
        </Card>
      ) : null}

      {tenancyQuery.data ? (
        <>
          <nav className="flex flex-wrap gap-3" aria-label="Owner property tenancy tabs">
            <SettingsTabButton active={activeTab === "dashboard"} label={t("private", "ownerPropertyTenancy.tabs.dashboard", "Dashboard loyers")} onClick={() => setActiveTab("dashboard")} />
            <SettingsTabButton active={activeTab === "tenants"} label={t("private", "ownerPropertyTenancy.tabs.tenants", "Locataires")} onClick={() => setActiveTab("tenants")} />
            <SettingsTabButton active={activeTab === "receipts"} label={t("private", "ownerPropertyTenancy.tabs.receipts", "Quittance")} onClick={() => setActiveTab("receipts")} />
            <SettingsTabButton active={activeTab === "feedback"} label={t("private", "ownerPropertyTenancy.tabs.feedback", "Feedback")} onClick={() => setActiveTab("feedback")} />
          </nav>

          {activeTab === "dashboard" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatTile label={t("private", "ownerPropertyTenancy.dashboard.totalRents", "Loyers suivis")} value={dashboard.totalRents || 0} />
                <StatTile label={t("private", "ownerPropertyTenancy.dashboard.paidRents", "Loyers payes")} value={dashboard.paidRents || 0} />
                <StatTile label={t("private", "ownerPropertyTenancy.dashboard.lateRents", "Loyers en retard")} value={dashboard.lateRents || 0} />
                <StatTile label={t("private", "ownerPropertyTenancy.dashboard.monthlyRevenue", "Revenus mensuels")} value={dashboard.monthlyRevenueLabel || formatMoney(dashboard.monthlyRevenue || 0, property.currency, preferences)} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
                <Card className="border-[var(--border)] bg-[var(--surface)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.dashboard.rentsTitle", "Resume des loyers")}</p>
                  <div className="mt-4 space-y-3">
                    {receipts.slice(0, 6).map((payment) => (
                      <div key={payment.id} className="flex flex-col gap-3 rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{payment.tenant}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">{payment.dueDateLabel}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[var(--foreground)]">{payment.amountLabel}</span>
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                      </div>
                    ))}
                    {!receipts.length ? <p className="text-sm text-[var(--muted)]">{t("private", "ownerPropertyTenancy.dashboard.noRents", "Aucun loyer rattache a ce bien.")}</p> : null}
                  </div>
                </Card>

                <Card className="border-[var(--border)] bg-[var(--surface)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.dashboard.alerts", "Alertes importantes")}</p>
                  <div className="mt-4 space-y-3">
                    {(dashboard.alerts || []).map((alert) => (
                      <div key={alert.id} className={`rounded-[1.35rem] border p-4 ${alert.tone === "alert" ? "border-red-500/25 bg-[var(--danger-surface)] text-[var(--danger-foreground)]" : "border-sky-500/25 bg-[var(--info-surface)] text-[var(--info-foreground)]"}`}>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="mt-2 text-sm leading-6 opacity-90">{alert.detail}</p>
                      </div>
                    ))}
                    {!dashboard.alerts?.length ? <p className="text-sm text-[var(--muted)]">{t("private", "ownerPropertyTenancy.dashboard.noAlerts", "Aucune alerte active pour ce bien.")}</p> : null}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {activeTab === "tenants" ? (
            <div className="space-y-5">
              <Input
                label={t("private", "ownerPropertyTenancy.tenants.search", "Recherche locataire")}
                value={tenantSearch}
                onChange={(event) => setTenantSearch(event.target.value)}
                placeholder={t("private", "ownerPropertyTenancy.tenants.searchPlaceholder", "Nom, contact, CIN, contrat...")}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                {filteredTenants.map((tenant) => (
                  <Card key={tenant.id} className="border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <Avatar src={tenant.linkedUser?.avatar} name={tenant.fullName} type="user" />
                        <div className="min-w-0">
                          <h3 className="break-words text-xl font-semibold text-[var(--foreground)]">{tenant.fullName}</h3>
                          <p className="mt-1 break-words text-sm text-[var(--muted)]">{tenant.email || tenant.phone || "-"}</p>
                        </div>
                      </div>
                      <ScoreBadge score={tenant.score || 0} showScore />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.tenants.contact", "Contact")}</p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">{tenant.contact || tenant.phone || "-"}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.tenants.contract", "Contrat associe")}</p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">{tenant.contractDetail?.reference || tenant.contract || "-"}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.tenants.identity", "Identite")}</p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">{tenant.cin || tenant.identity || "-"}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.tenants.source", "Source")}</p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">{tenant.source || "-"}</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "ownerPropertyTenancy.tenants.paymentHistory", "Historique des paiements")}</p>
                      <div className="mt-3 space-y-2">
                        {(tenant.payments || []).slice(0, 4).map((payment) => (
                          <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="text-[var(--foreground)]">{payment.dueDateLabel}</span>
                            <span className="font-medium text-[var(--foreground)]">{payment.amountLabel}</span>
                            <PaymentStatusBadge status={payment.status} />
                          </div>
                        ))}
                        {!tenant.payments?.length ? <p className="text-sm text-[var(--muted)]">{t("private", "ownerPropertyTenancy.tenants.noPayments", "Aucun paiement disponible.")}</p> : null}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => handleContactTenant(tenant)}>
                        {t("private", "ownerPropertyTenancy.tenants.contactAction", "Contacter")}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => navigate("/owner/tenants")}>
                        {t("private", "ownerPropertyTenancy.tenants.openFile", "Fiche locataire")}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {!filteredTenants.length ? (
                <Card className="border-dashed border-[var(--border)] text-center">
                  <p className="text-sm text-[var(--muted)]">{t("private", "ownerPropertyTenancy.tenants.empty", "Aucun locataire ne correspond aux filtres pour ce bien.")}</p>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeTab === "receipts" ? (
            <div className="space-y-4">
              {receipts.map((receipt) => {
                const canGenerateReceipt = Boolean(receipt.canGenerateReceipt);
                const canDownloadReceipt = Boolean(receipt.canDownloadReceipt);

                return (
                  <Card key={receipt.id} className="border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <PaymentStatusBadge status={receipt.status} />
                          {receipt.receiptNumber ? <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{receipt.receiptNumber}</Badge> : null}
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{receipt.tenant}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">{receipt.dueDateLabel} - {receipt.amountLabel}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" disabled={!canGenerateReceipt || receiptMutation.isPending} onClick={() => handleGenerateReceipt(receipt.id)}>
                          {receipt.receiptNumber ? t("private", "ownerPropertyTenancy.receipts.generated", "Generee") : t("private", "ownerPropertyTenancy.receipts.generate", "Generer")}
                        </Button>
                        <Button type="button" variant="secondary" disabled={!canDownloadReceipt || receiptMutation.isPending} onClick={() => handleDownloadReceipt(receipt)}>
                          {t("private", "ownerPropertyTenancy.receipts.download", "Telecharger")}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {!receipts.length ? (
                <Card className="border-dashed border-[var(--border)] text-center">
                  <p className="text-sm text-[var(--muted)]">{t("private", "ownerPropertyTenancy.receipts.empty", "Aucune quittance disponible pour ce bien.")}</p>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeTab === "feedback" ? (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <Input
                  label={t("private", "ownerPropertyTenancy.feedback.search", "Recherche feedback")}
                  value={feedbackSearch}
                  onChange={(event) => setFeedbackSearch(event.target.value)}
                  placeholder={t("private", "ownerPropertyTenancy.feedback.searchPlaceholder", "Locataire, message, objet...")}
                />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "ownerPropertyTenancy.feedback.period", "Periode")}</span>
                  <select
                    value={feedbackPeriod}
                    onChange={(event) => setFeedbackPeriod(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-brand-500"
                  >
                    <option value="all">{t("private", "ownerPropertyTenancy.feedback.allPeriods", "Toutes")}</option>
                    <option value="30">{t("private", "ownerPropertyTenancy.feedback.last30", "30 derniers jours")}</option>
                    <option value="90">{t("private", "ownerPropertyTenancy.feedback.last90", "90 derniers jours")}</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {filteredFeedbacks.map((feedback) => (
                  <Card key={feedback.id} className="border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={feedbackStatusClassName[feedback.status] || feedbackStatusClassName.new}>
                            {feedback.status === "handled" ? t("private", "ownerPropertyTenancy.feedback.handled", "Traite") : t("private", "ownerPropertyTenancy.feedback.new", "Nouveau")}
                          </Badge>
                          <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{feedback.rating}/5</Badge>
                        </div>
                        <h3 className="mt-3 break-words text-xl font-semibold text-[var(--foreground)]">{feedback.subject || t("private", "ownerPropertyTenancy.feedback.subjectFallback", "Feedback sans objet")}</h3>
                        <p className="mt-2 text-sm text-[var(--muted)]">{feedback.user?.fullName || feedback.user?.email || "-"}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{feedback.createdAtLabel}</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{feedback.message}</p>
                    {feedback.status !== "handled" ? (
                      <div className="mt-5 flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={feedbackMutation.isPending}
                          onClick={() => feedbackMutation.mutate({ propertyId, feedbackId: feedback.id })}
                        >
                          {t("private", "ownerPropertyTenancy.feedback.markHandled", "Marquer comme traite")}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>

              {!filteredFeedbacks.length ? (
                <Card className="border-dashed border-[var(--border)] text-center">
                  <p className="text-sm text-[var(--muted)]">{t("private", "ownerPropertyTenancy.feedback.empty", "Aucun feedback ne correspond aux filtres.")}</p>
                </Card>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default OwnerPropertyTenantsManagementPage;
