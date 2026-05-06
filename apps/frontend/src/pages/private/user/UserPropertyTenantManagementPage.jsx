import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Textarea } from "../../../components/ui/Textarea.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { notifyApiErrors } from "../../../lib/errors/api-error.js";
import { SettingsTabButton } from "../settings/SettingsTabButton.jsx";
import {
  createUserAssetFeedback,
  getUserAssetDetail,
  getUserRentReceipt,
  payUserRent,
  reportUserAssetIssue
} from "../../../features/user-assets/services/user-assets.service.js";

const issueSchema = z.object({
  title: z.string().trim().min(3, "Titre requis"),
  description: z.string().trim().min(10, "Description trop courte"),
  priority: z.enum(["low", "medium", "high"])
});

const feedbackSchema = z.object({
  subject: z.string().trim().max(160).default(""),
  message: z.string().trim().min(10, "Message trop court"),
  rating: z.coerce.number().min(0).max(5)
});

const PaymentStatusBadge = ({ status }) => {
  const className = status === "paid"
    ? "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]"
    : status === "late"
      ? "border-red-500/25 bg-[var(--danger-surface)] text-[var(--danger-foreground)]"
      : "border-amber-500/25 bg-[var(--warning-surface)] text-[var(--warning-foreground)]";
  return <Badge className={className}>{status}</Badge>;
};

export const UserPropertyTenantManagementPage = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useUserPreferences();
  const { showError, showSuccess } = useNotification();
  const [activeTab, setActiveTab] = useState("rents");
  const [neighborSearch, setNeighborSearch] = useState("");
  const detailQuery = useQuery({
    queryKey: ["user-asset-detail", "rented", assetId],
    queryFn: () => getUserAssetDetail({ assetType: "rented", assetId }),
    enabled: Boolean(assetId)
  });

  const issueForm = useForm({
    resolver: zodResolver(issueSchema),
    defaultValues: { title: "", description: "", priority: "medium" }
  });
  const feedbackForm = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { subject: "", message: "", rating: 4 }
  });

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: ["user-asset-detail", "rented", assetId] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const payMutation = useMutation({
    mutationFn: payUserRent,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.paymentSuccess", "Paiement synchronise et quittance disponible."));
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.paymentError", "Impossible de synchroniser le paiement.") })
  });

  const issueMutation = useMutation({
    mutationFn: reportUserAssetIssue,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.issueSuccess", "Probleme signale au proprietaire."));
      issueForm.reset({ title: "", description: "", priority: "medium" });
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.issueError", "Impossible de signaler ce probleme.") })
  });

  const feedbackMutation = useMutation({
    mutationFn: createUserAssetFeedback,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.feedbackSuccess", "Feedback envoye."));
      feedbackForm.reset({ subject: "", message: "", rating: 4 });
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.feedbackError", "Impossible d'envoyer le feedback.") })
  });

  const detail = detailQuery.data;
  const filteredNeighbors = useMemo(() => {
    const query = neighborSearch.trim().toLowerCase();
    return (detail?.neighbors || []).filter((neighbor) => {
      if (!query) return true;
      return [neighbor.fullName, neighbor.email, neighbor.phone, neighbor.contact].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [detail?.neighbors, neighborSearch]);

  const handleReceiptDownload = async (paymentId) => {
    try {
      const receipt = await getUserRentReceipt({ assetType: "rented", assetId, paymentId });
      const blob = new Blob([receipt.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${receipt.receiptNumber || "quittance"}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.receiptError", "Impossible de telecharger la quittance.") });
    }
  };

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => navigate("/my-properties")}>{t("private", "common.back", "Retour")}</Button>
      </div>

      <Card className="border-[var(--border)] bg-[var(--surface)]">
        <SectionTitle
          eyebrow={t("private", "userTenant.eyebrow", "Gestion locataire")}
          title={detail?.property?.title || t("private", "userTenant.title", "Gestion du bien loue")}
          description={t("private", "userTenant.description", "Suivez vos loyers, signalez un probleme, consultez les voisins et envoyez un feedback lie au bien.")}
        />
      </Card>

      {detailQuery.isLoading ? <Card><p className="text-sm text-[var(--muted)]">{t("private", "userTenant.loading", "Chargement de la gestion locataire...")}</p></Card> : null}
      {detailQuery.isError ? <Card className="border-red-500/20 bg-[var(--danger-surface)]"><p className="text-sm text-[var(--danger-foreground)]">{t("private", "userTenant.error", "Impossible de charger cette gestion.")}</p></Card> : null}

      {detail ? (
        <>
          <nav className="flex flex-wrap gap-3" aria-label="Tenant management tabs">
            <SettingsTabButton active={activeTab === "rents"} label={t("private", "userTenant.tabs.rents", "Gestion de loyer")} onClick={() => setActiveTab("rents")} />
            <SettingsTabButton active={activeTab === "issue"} label={t("private", "userTenant.tabs.issue", "Signaler un probleme")} onClick={() => setActiveTab("issue")} />
            <SettingsTabButton active={activeTab === "neighbors"} label={t("private", "userTenant.tabs.neighbors", "Voisins")} onClick={() => setActiveTab("neighbors")} />
            <SettingsTabButton active={activeTab === "feedback"} label={t("private", "userTenant.tabs.feedback", "Feedback")} onClick={() => setActiveTab("feedback")} />
          </nav>

          {activeTab === "rents" ? (
            <div className="grid gap-4">
              {(detail.payments || []).map((payment) => (
                <Card key={payment.id} className="border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <PaymentStatusBadge status={payment.status} />
                        {payment.receiptNumber ? <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{payment.receiptNumber}</Badge> : null}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{payment.amountLabel}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{payment.dueDateLabel}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {payment.status !== "paid" ? (
                        <Button type="button" onClick={() => payMutation.mutate({ assetType: "rented", assetId, paymentId: payment.id })} disabled={payMutation.isPending}>
                          {t("private", "userTenant.actions.pay", "Payer")}
                        </Button>
                      ) : null}
                      <Button type="button" variant="secondary" onClick={() => handleReceiptDownload(payment.id)}>
                        {t("private", "userTenant.actions.receipt", "Telecharger la quittance")}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {!detail.payments?.length ? <Card><p className="text-sm text-[var(--muted)]">{t("private", "userTenant.emptyPayments", "Aucun paiement de loyer disponible.")}</p></Card> : null}
            </div>
          ) : null}

          {activeTab === "issue" ? (
            <Card className="border-[var(--border)] bg-[var(--surface)]">
              <form className="grid gap-4" onSubmit={issueForm.handleSubmit((values) => issueMutation.mutate({ assetType: "rented", assetId, payload: values }))}>
                <Input label={t("private", "userTenant.issue.title", "Objet")} error={issueForm.formState.errors.title?.message} {...issueForm.register("title")} />
                <Textarea label={t("private", "userTenant.issue.description", "Detail")} error={issueForm.formState.errors.description?.message} rows={6} {...issueForm.register("description")} />
                <Controller
                  control={issueForm.control}
                  name="priority"
                  render={({ field }) => (
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "userTenant.issue.priority", "Priorite")}</span>
                      <select {...field} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none">
                        <option value="low">{t("private", "priorities.low", "Basse")}</option>
                        <option value="medium">{t("private", "priorities.medium", "Moyenne")}</option>
                        <option value="high">{t("private", "priorities.high", "Haute")}</option>
                      </select>
                    </label>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={issueMutation.isPending}>{t("private", "userTenant.actions.report", "Signaler")}</Button>
                </div>
              </form>
            </Card>
          ) : null}

          {activeTab === "neighbors" ? (
            <div className="space-y-4">
              <Input label={t("private", "userTenant.neighbors.search", "Recherche")} value={neighborSearch} onChange={(event) => setNeighborSearch(event.target.value)} />
              <div className="grid gap-4 md:grid-cols-2">
                {filteredNeighbors.map((neighbor) => (
                  <Card key={neighbor.id} className="border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center gap-4">
                      <Avatar src={neighbor.avatar} name={neighbor.fullName} type="user" />
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)]">{neighbor.fullName}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">{neighbor.contact || neighbor.email || neighbor.phone || "-"}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {!filteredNeighbors.length ? <Card><p className="text-sm text-[var(--muted)]">{t("private", "userTenant.neighbors.empty", "Aucun voisin affiche pour ce bien.")}</p></Card> : null}
            </div>
          ) : null}

          {activeTab === "feedback" ? (
            <Card className="border-[var(--border)] bg-[var(--surface)]">
              <form className="grid gap-4" onSubmit={feedbackForm.handleSubmit((values) => feedbackMutation.mutate({ assetType: "rented", assetId, payload: values }))}>
                <Input label={t("private", "userTenant.feedback.subject", "Objet")} {...feedbackForm.register("subject")} />
                <Controller
                  control={feedbackForm.control}
                  name="rating"
                  render={({ field }) => (
                    <Input type="number" min="0" max="5" step="1" label={t("private", "userTenant.feedback.rating", "Note")} error={feedbackForm.formState.errors.rating?.message} {...field} />
                  )}
                />
                <Textarea label={t("private", "userTenant.feedback.message", "Feedback")} rows={6} error={feedbackForm.formState.errors.message?.message} {...feedbackForm.register("message")} />
                <div className="flex justify-end">
                  <Button type="submit" disabled={feedbackMutation.isPending}>{t("private", "userTenant.actions.feedback", "Envoyer")}</Button>
                </div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default UserPropertyTenantManagementPage;
