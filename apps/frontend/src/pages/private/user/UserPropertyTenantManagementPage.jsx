import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
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
import { ModalPayment } from "../ModalPayment.jsx";
import { ModalManageTicket } from "../owner/ModalManageTicket.jsx";
import { PaymentToolbar, RentPaymentsTable } from "../../../features/owner/RentPaymentsTable.jsx";
import {
  createUserRentPayment,
  deleteUserRentPayment,
  createUserAssetFeedback,
  getUserAssetDetail,
  getUserRentReceipt,
  updateUserRentPayment,
  reportUserAssetIssue
} from "../../../features/user-assets/services/user-assets.service.js";

const buildFeedbackSchema = (t) => z.object({
  subject: z.string().trim().max(160).default(""),
  message: z.string().trim().min(10, t("private", "userTenant.feedback.validation.message", "Message trop court")),
  rating: z.coerce.number().min(0).max(5)
});

const ticketStatusClassName = {
  planned: "border-sky-500/25 bg-[var(--info-surface)] text-[var(--info-foreground)]",
  in_progress: "border-amber-500/25 bg-[var(--warning-surface)] text-[var(--warning-foreground)]",
  closed: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]"
};

const priorityClassName = {
  high: "border-red-500/25 bg-[var(--danger-surface)] text-[var(--danger-foreground)]",
  medium: "border-amber-500/25 bg-[var(--warning-surface)] text-[var(--warning-foreground)]",
  low: "border-sky-500/25 bg-[var(--info-surface)] text-[var(--info-foreground)]"
};

const feedbackStatusClassName = {
  handled: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]",
  new: "border-sky-500/25 bg-[var(--info-surface)] text-[var(--info-foreground)]"
};

const FeedbackModal = ({ open, onClose, onSubmit, isSaving }) => {
  const { t } = useUserPreferences();
  const feedbackSchema = useMemo(() => buildFeedbackSchema(t), [t]);
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { subject: "", message: "", rating: 4 }
  });

  useEffect(() => {
    if (open) {
      reset({ subject: "", message: "", rating: 4 });
    }
  }, [open, reset]);

  return (
    <ModalLayout
      open={open}
      title={t("private", "userTenant.feedback.modalTitle", "Nouveau feedback")}
      onClose={onClose}
      onSave={handleSubmit((values) => onSubmit({ ...values, rating: Number(values.rating || 0) }))}
      saveLabel={t("private", "userTenant.feedback.save", "Envoyer")}
      cancelLabel={t("private", "common.cancel", "Annuler")}
      isSaving={isSaving}
    >
      <div className="space-y-5">
        <Controller
          control={control}
          name="subject"
          render={({ field }) => (
            <Input
              label={t("private", "userTenant.feedback.subject", "Objet")}
              placeholder={t("private", "userTenant.feedback.subjectPlaceholder", "Objet du feedback")}
              error={errors.subject?.message}
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <Input
              type="number"
              min="0"
              max="5"
              step="1"
              label={t("private", "userTenant.feedback.rating", "Note")}
              error={errors.rating?.message}
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <Textarea
              label={t("private", "userTenant.feedback.message", "Feedback")}
              placeholder={t("private", "userTenant.feedback.messagePlaceholder", "Expliquez votre experience ou votre remarque sur ce bien.")}
              rows={6}
              error={errors.message?.message}
              {...field}
            />
          )}
        />
      </div>
    </ModalLayout>
  );
};

export const UserPropertyTenantManagementPage = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useUserPreferences();
  const { showError, showSuccess } = useNotification();
  const [activeTab, setActiveTab] = useState("rents");
  const [neighborSearch, setNeighborSearch] = useState("");
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState({ open: false, mode: "create", payment: null });
  const detailQuery = useQuery({
    queryKey: ["user-asset-detail", "rented", assetId],
    queryFn: () => getUserAssetDetail({ assetType: "rented", assetId }),
    enabled: Boolean(assetId)
  });

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: ["user-asset-detail", "rented", assetId] });
    queryClient.invalidateQueries({ queryKey: ["owner-maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["owner-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createPaymentMutation = useMutation({
    mutationFn: createUserRentPayment,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.paymentSuccess", "Paiement ajoute et envoye au proprietaire pour approbation."));
      setPaymentModalState({ open: false, mode: "create", payment: null });
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.paymentError", "Impossible de synchroniser le paiement.") })
  });

  const updatePaymentMutation = useMutation({
    mutationFn: updateUserRentPayment,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.paymentUpdateSuccess", "Paiement mis a jour."));
      setPaymentModalState({ open: false, mode: "create", payment: null });
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.paymentError", "Impossible de synchroniser le paiement.") })
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deleteUserRentPayment,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.paymentDeleteSuccess", "Paiement supprime."));
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.paymentDeleteError", "Impossible de supprimer ce paiement.") })
  });

  const issueMutation = useMutation({
    mutationFn: reportUserAssetIssue,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.issueSuccess", "Probleme signale au proprietaire."));
      setIssueModalOpen(false);
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.issueError", "Impossible de signaler ce probleme.") })
  });

  const feedbackMutation = useMutation({
    mutationFn: createUserAssetFeedback,
    onSuccess: () => {
      showSuccess(t("private", "userTenant.messages.feedbackSuccess", "Feedback envoye."));
      setFeedbackModalOpen(false);
      invalidateDetail();
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userTenant.messages.feedbackError", "Impossible d'envoyer le feedback.") })
  });

  const detail = detailQuery.data;
  const paymentContext = useMemo(() => ({
    property: detail?.property,
    contract: detail?.contract,
    owner: detail?.owner || detail?.previousOwner,
    agent: detail?.agent,
    tenant: detail?.tenant
  }), [detail]);
  const userPropertyOptions = useMemo(() => {
    if (!detail?.property?.id) return [];

    return [{
      value: detail.property.id,
      label: detail.property.title || t("private", "userTenant.issue.propertyFallback", "Bien selectionne"),
      type: detail.property.type
    }];
  }, [detail?.property, t]);
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

  const handleSubmitPayment = (payload) => {
    if (paymentModalState.mode === "edit" && paymentModalState.payment) {
      updatePaymentMutation.mutate({
        assetType: "rented",
        assetId,
        paymentId: paymentModalState.payment.id,
        payload
      });
      return;
    }

    createPaymentMutation.mutate({ assetType: "rented", assetId, payload });
  };

  const handleSubmitIssue = (values) => {
    issueMutation.mutate({
      assetType: "rented",
      assetId,
      payload: {
        title: values.title,
        description: values.description,
        priority: values.priority
      }
    });
  };

  const getTicketStatusLabel = (status) => ({
    planned: t("private", "owner.maintenance.status.planned", "Planifie"),
    in_progress: t("private", "owner.maintenance.status.inProgress", "En cours"),
    closed: t("private", "owner.maintenance.status.closed", "Cloture")
  })[status] || status;

  const getPriorityLabel = (priority) => ({
    high: t("private", "priorities.high", "Haute"),
    medium: t("private", "priorities.medium", "Moyenne"),
    low: t("private", "priorities.low", "Basse")
  })[priority] || priority;

  const getFeedbackStatusLabel = (status) => ({
    handled: t("private", "userTenant.feedback.handled", "Traite"),
    new: t("private", "userTenant.feedback.new", "Nouveau")
  })[status] || status;

  const handleDeletePayment = (payment) => {
    const confirmed = window.confirm(t("private", "userTenant.messages.confirmDeletePayment", "Supprimer ce paiement ?"));
    if (!confirmed) return;

    deletePaymentMutation.mutate({ assetType: "rented", assetId, paymentId: payment.id });
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
            <div className="space-y-4">
              <PaymentToolbar
                title={t("private", "userTenant.rents.title", "Gestion de loyer")}
                description={t("private", "userTenant.rents.description", "Ajoutez vos paiements et suivez leur validation par le proprietaire. La quittance devient disponible apres approbation.")}
                actionLabel={t("private", "payments.actions.add", "Ajouter un paiement")}
                onAction={() => setPaymentModalState({ open: true, mode: "create", payment: null })}
                disabled={createPaymentMutation.isPending}
              />
              <RentPaymentsTable
                payments={detail.payments || []}
                isBusy={createPaymentMutation.isPending || updatePaymentMutation.isPending || deletePaymentMutation.isPending}
                emptyLabel={t("private", "userTenant.emptyPayments", "Aucun paiement de loyer disponible.")}
                onEdit={(payment) => setPaymentModalState({ open: true, mode: "edit", payment })}
                onDelete={handleDeletePayment}
                onDownloadReceipt={(payment) => handleReceiptDownload(payment.id)}
              />
            </div>
          ) : null}

          {activeTab === "issue" ? (
            <div className="space-y-4">
              <Card className="border-[var(--border)] bg-[var(--surface)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">{t("private", "userTenant.issue.listTitle", "Demandes de maintenance")}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t("private", "userTenant.issue.listDescription", "Les problemes signales ici arrivent dans la gestion de maintenance du proprietaire.")}</p>
                  </div>
                  <Button type="button" disabled={issueMutation.isPending || !userPropertyOptions.length} onClick={() => setIssueModalOpen(true)}>
                    {t("private", "userTenant.issue.newTicket", "Signaler un probleme")}
                  </Button>
                </div>
              </Card>
              <div className="space-y-3">
                {(detail.maintenance || []).map((ticket) => (
                  <Card key={ticket.id} className="border-[var(--border)] bg-[var(--surface)] shadow-none">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={ticketStatusClassName[ticket.status] || ticketStatusClassName.planned}>{getTicketStatusLabel(ticket.status)}</Badge>
                          <Badge className={priorityClassName[ticket.priority] || priorityClassName.medium}>{getPriorityLabel(ticket.priority)}</Badge>
                        </div>
                        <h3 className="mt-3 break-words text-lg font-semibold text-[var(--foreground)]">{ticket.title || t("private", "userTenant.issue.ticketFallback", "Ticket de maintenance")}</h3>
                        {ticket.description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{ticket.description}</p> : null}
                      </div>
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{ticket.createdAtLabel || "-"}</span>
                    </div>
                  </Card>
                ))}
                {!detail.maintenance?.length ? (
                  <Card className="border-dashed border-[var(--border)] text-center shadow-none">
                    <p className="text-sm text-[var(--muted)]">{t("private", "userTenant.issue.empty", "Aucune demande de maintenance pour ce bien.")}</p>
                  </Card>
                ) : null}
              </div>
            </div>
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
            <div className="space-y-4">
              <Card className="border-[var(--border)] bg-[var(--surface)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">{t("private", "userTenant.feedback.listTitle", "Feedbacks envoyes")}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t("private", "userTenant.feedback.listDescription", "Gardez l'historique de vos retours et de leur traitement par le proprietaire.")}</p>
                  </div>
                  <Button type="button" disabled={feedbackMutation.isPending} onClick={() => setFeedbackModalOpen(true)}>
                    {t("private", "userTenant.feedback.newFeedback", "Nouveau feedback")}
                  </Button>
                </div>
              </Card>
              <div className="space-y-3">
                {(detail.feedbacks || []).map((feedback) => (
                  <Card key={feedback.id} className="border-[var(--border)] bg-[var(--surface)] shadow-none">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={feedbackStatusClassName[feedback.status] || feedbackStatusClassName.new}>{getFeedbackStatusLabel(feedback.status)}</Badge>
                          <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{feedback.rating}/5</Badge>
                        </div>
                        <h3 className="mt-3 break-words text-lg font-semibold text-[var(--foreground)]">{feedback.subject || t("private", "userTenant.feedback.noSubject", "Feedback sans objet")}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{feedback.message}</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{feedback.createdAtLabel || "-"}</span>
                    </div>
                  </Card>
                ))}
                {!detail.feedbacks?.length ? (
                  <Card className="border-dashed border-[var(--border)] text-center shadow-none">
                    <p className="text-sm text-[var(--muted)]">{t("private", "userTenant.feedback.empty", "Aucun feedback envoye pour ce bien.")}</p>
                  </Card>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      <ModalPayment
        open={paymentModalState.open}
        mode={paymentModalState.mode}
        role="tenant"
        context={paymentContext}
        payment={paymentModalState.payment}
        onClose={() => setPaymentModalState({ open: false, mode: "create", payment: null })}
        onSubmit={handleSubmitPayment}
        isSaving={createPaymentMutation.isPending || updatePaymentMutation.isPending}
      />
      <ModalManageTicket
        open={issueModalOpen}
        mode="create"
        propertyOptions={userPropertyOptions}
        propertySelectDisabled
        showOwnerFields={false}
        descriptionRequired
        titleOverride={t("private", "userTenant.issue.modalTitle", "Signaler un probleme")}
        saveLabelOverride={t("private", "userTenant.actions.report", "Signaler")}
        onClose={() => setIssueModalOpen(false)}
        onSubmit={handleSubmitIssue}
        isSaving={issueMutation.isPending}
      />
      <FeedbackModal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onSubmit={(payload) => feedbackMutation.mutate({ assetType: "rented", assetId, payload })}
        isSaving={feedbackMutation.isPending}
      />
    </section>
  );
};

export default UserPropertyTenantManagementPage;
