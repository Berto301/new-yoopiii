import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";
import { ModalLayout } from "../../components/layout/modals/ModalLayout.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Textarea } from "../../components/ui/Textarea.jsx";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";

const paymentMethods = ["cash", "bank_transfer", "mobile_money", "card", "check", "other"];

const paymentSchema = z.object({
  tenantId: z.string().trim().optional().default(""),
  dueDate: z.string().trim().min(1, "Date d'echeance requise"),
  paymentDate: z.string().trim().min(1, "Date de paiement requise"),
  paymentMethod: z.enum(paymentMethods),
  paymentReference: z.string().trim().max(160).default(""),
  paidAmount: z.coerce.number().min(0, "Montant invalide"),
  proofName: z.string().trim().max(255).default(""),
  note: z.string().trim().max(2000).default("")
});

const toDateInputValue = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const InfoItem = ({ label, value }) => (
  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
    <p className="mt-1 break-words text-sm font-medium text-[var(--foreground)]">{value || "-"}</p>
  </div>
);

export const ModalPayment = ({
  open,
  mode = "create",
  role = "tenant",
  context = null,
  payment = null,
  tenantOptions = [],
  onClose,
  onSubmit,
  isSaving = false
}) => {
  const { t, preferences } = useUserPreferences();
  const needsTenantSelection = role === "owner" && tenantOptions.length > 0;
  const defaultTenantId = payment?.tenantId || context?.tenant?.id || tenantOptions[0]?.value || "";

  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      tenantId: defaultTenantId,
      dueDate: toDateInputValue(payment?.dueDate || context?.contract?.nextPaymentDate),
      paymentDate: toDateInputValue(payment?.paymentDate),
      paymentMethod: payment?.paymentMethod || "bank_transfer",
      paymentReference: payment?.paymentReference || "",
      paidAmount: payment?.paidAmount ?? context?.contract?.rentAmount ?? context?.property?.price ?? tenantOptions[0]?.rentAmount ?? 0,
      proofName: payment?.proofName || "",
      note: payment?.note || ""
    }
  });

  useEffect(() => {
    if (!open) return;
    const nextTenantId = payment?.tenantId || context?.tenant?.id || tenantOptions[0]?.value || "";
    const selectedTenant = tenantOptions.find((tenant) => tenant.value === nextTenantId);
    form.reset({
      tenantId: nextTenantId,
      dueDate: toDateInputValue(payment?.dueDate || selectedTenant?.nextPaymentDate || context?.contract?.nextPaymentDate),
      paymentDate: toDateInputValue(payment?.paymentDate),
      paymentMethod: payment?.paymentMethod || selectedTenant?.paymentMethod || "bank_transfer",
      paymentReference: payment?.paymentReference || "",
      paidAmount: payment?.paidAmount ?? selectedTenant?.rentAmount ?? context?.contract?.rentAmount ?? context?.property?.price ?? 0,
      proofName: payment?.proofName || "",
      note: payment?.note || ""
    });
  }, [context, form, open, payment, tenantOptions]);

  const selectedTenantId = form.watch("tenantId");
  const selectedTenant = useMemo(
    () => tenantOptions.find((tenant) => tenant.value === selectedTenantId) || tenantOptions[0] || null,
    [selectedTenantId, tenantOptions]
  );
  const resolved = useMemo(() => {
    if (!selectedTenant) return context || {};

    return {
      property: {
        id: selectedTenant.propertyId,
        title: selectedTenant.propertyTitle,
        address: selectedTenant.propertyAddress,
        coverImage: selectedTenant.coverImage,
        price: selectedTenant.rentAmount,
        currency: selectedTenant.currency
      },
      tenant: {
        id: selectedTenant.value,
        fullName: selectedTenant.tenantName || selectedTenant.label
      },
      contract: {
        id: selectedTenant.contractId,
        reference: selectedTenant.contractLabel,
        rentAmount: selectedTenant.rentAmount,
        currency: selectedTenant.currency
      },
      owner: context?.owner,
      agent: context?.agent
    };
  }, [context, selectedTenant]);

  const currency = resolved.contract?.currency || resolved.property?.currency || preferences.currency;
  const rentAmount = Number(resolved.contract?.rentAmount ?? resolved.property?.price ?? 0);
  const coverImage = resolveAssetUrl(resolved.property?.coverImage || "");

  const handleSubmit = form.handleSubmit((values) => {
    const selected = tenantOptions.find((tenant) => tenant.value === values.tenantId) || selectedTenant;
    onSubmit?.({
      ...(selected ? {
        managedPropertyId: selected.propertyId,
        tenantId: selected.value,
        managementContractId: selected.contractId || null,
        amount: Number(selected.rentAmount || rentAmount || 0),
        currency: selected.currency || currency
      } : {}),
      dueDate: values.dueDate,
      paymentDate: values.paymentDate,
      paymentMethod: values.paymentMethod,
      paymentReference: values.paymentReference,
      paidAmount: Number(values.paidAmount || 0),
      proofName: values.proofName,
      note: values.note
    });
  });

  return (
    <ModalLayout
      open={open}
      title={mode === "edit" ? t("private", "payments.modal.editTitle", "Modifier le paiement") : t("private", "payments.modal.createTitle", "Ajouter un paiement")}
      saveLabel={mode === "edit" ? t("private", "common.save", "Enregistrer") : t("private", "payments.modal.submit", "Ajouter le paiement")}
      cancelLabel={t("private", "common.cancel", "Annuler")}
      onClose={onClose}
      onSave={handleSubmit}
      saveDisabled={isSaving || (needsTenantSelection && !selectedTenantId)}
      isSaving={isSaving}
      panelClassName="max-w-5xl"
    >
      <div className="space-y-6">
        {needsTenantSelection ? (
          <Controller
            control={form.control}
            name="tenantId"
            render={({ field }) => (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "payments.modal.tenant", "Locataire / bien")}</span>
                <select {...field} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-brand-500">
                  {tenantOptions.map((tenant) => (
                    <option key={tenant.value} value={tenant.value}>
                      {tenant.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="min-h-[180px] overflow-hidden rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-soft)]">
            {coverImage ? <img src={coverImage} alt={resolved.property?.title || ""} className="h-full min-h-[180px] w-full object-cover" /> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoItem label={t("private", "payments.modal.property", "Bien")} value={resolved.property?.title} />
            <InfoItem label={t("private", "payments.modal.address", "Adresse")} value={resolved.property?.address} />
            <InfoItem label={t("private", "payments.modal.owner", "Proprietaire")} value={resolved.owner?.fullName || resolved.owner?.email} />
            <InfoItem label={t("private", "payments.modal.agent", "Agent responsable")} value={resolved.agent?.fullName || resolved.agent?.email} />
            <InfoItem label={t("private", "payments.modal.contract", "Contrat associe")} value={resolved.contract?.reference} />
            <InfoItem label={t("private", "payments.modal.currency", "Devise")} value={currency} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "payments.modal.rent", "Loyer")}</span>
            <div className="flex overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
              <input readOnly value={formatMoney(rentAmount, currency, preferences)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-[var(--muted)] outline-none" />
              <span className="border-l border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">{currency}</span>
            </div>
          </label>
          <Controller
            control={form.control}
            name="paidAmount"
            render={({ field }) => (
              <Input type="number" min="0" step="0.01" label={t("private", "payments.modal.paidAmount", "Montant paye")} error={form.formState.errors.paidAmount?.message} {...field} />
            )}
          />
          <Input type="date" label={t("private", "payments.modal.dueDate", "Echeance")} error={form.formState.errors.dueDate?.message} {...form.register("dueDate")} />
          <Input type="date" label={t("private", "payments.modal.paymentDate", "Date de paiement")} error={form.formState.errors.paymentDate?.message} {...form.register("paymentDate")} />
          <Controller
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "payments.modal.method", "Mode de paiement")}</span>
                <select {...field} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-brand-500">
                  <option value="cash">{t("private", "payments.methods.cash", "Especes")}</option>
                  <option value="bank_transfer">{t("private", "payments.methods.bankTransfer", "Virement")}</option>
                  <option value="mobile_money">{t("private", "payments.methods.mobileMoney", "Mobile money")}</option>
                  <option value="card">{t("private", "payments.methods.card", "Carte bancaire")}</option>
                  <option value="check">{t("private", "payments.methods.check", "Cheque")}</option>
                  <option value="other">{t("private", "payments.methods.other", "Autre")}</option>
                </select>
              </label>
            )}
          />
          <Input label={t("private", "payments.modal.reference", "Reference de paiement")} {...form.register("paymentReference")} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <Controller
            control={form.control}
            name="proofName"
            render={({ field }) => (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "payments.modal.proof", "Preuve de paiement")}</span>
                <input
                  type="file"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--surface-muted)] file:px-4 file:py-2 file:text-sm file:text-[var(--foreground)]"
                  onChange={(event) => field.onChange(event.target.files?.[0]?.name || "")}
                />
                {field.value ? <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{field.value}</Badge> : null}
              </label>
            )}
          />
          <Textarea label={t("private", "payments.modal.note", "Note / commentaire")} rows={4} {...form.register("note")} />
        </div>
      </div>
    </ModalLayout>
  );
};

export default ModalPayment;
