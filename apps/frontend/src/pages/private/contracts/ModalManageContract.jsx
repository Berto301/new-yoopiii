import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { getAgencyDirectory, getAgencyDirectoryAgents, getDiscoverableAgents } from "../../../features/directory/services/directory.service.js";

const statusOptions = [
  { label: "Brouillon", value: "draft" },
  { label: "En signature", value: "pending_signature" },
  { label: "Signe", value: "signed" },
  { label: "Accepte", value: "accepted" },
  { label: "Actif", value: "active" },
  { label: "Suspendu", value: "suspended" },
  { label: "Expire", value: "expired" },
  { label: "Resilie", value: "terminated" }
];

const contractTypeOptions = [
  { label: "Agence", value: "agency" },
  { label: "Agent", value: "agent" }
];

const paymentFrequencyOptions = [
  { label: "Mensuel", value: "monthly" },
  { label: "Trimestriel", value: "quarterly" },
  { label: "Semestriel", value: "semiannual" },
  { label: "Annuel", value: "yearly" },
  { label: "Paiement integral", value: "one_time" }
];

const paymentMethodOptions = [
  { label: "Virement bancaire", value: "bank_transfer" },
  { label: "Especes", value: "cash" },
  { label: "Cheque", value: "check" },
  { label: "Mobile Money", value: "mobile_money" },
  { label: "Carte bancaire", value: "card" }
];

const paymentTrackingStatusOptions = [
  { label: "A suivre", value: "to_follow" },
  { label: "A jour", value: "up_to_date" },
  { label: "En retard", value: "late" },
  { label: "Partiel", value: "partial" },
  { label: "Suspendu", value: "suspended" }
];

const documentKindOptions = [
  { label: "Contrat signe", value: "contract_signed" },
  { label: "Identite proprietaire", value: "owner_identity" },
  { label: "Identite agent", value: "agent_identity" },
  { label: "Documents agence", value: "agency_documents" },
  { label: "Document bien", value: "property_document" },
  { label: "Annexe", value: "annex" },
  { label: "Document legal", value: "legal_document" }
];

const TextareaField = ({ label, error, className = "", ...props }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-stone-200">{label}</span>
    <textarea
      className={`min-h-28 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500 ${error ? "border-red-400/60" : ""} ${className}`.trim()}
      {...props}
    />
    {error ? <span className="text-xs text-red-300">{error}</span> : null}
  </label>
);

const SectionCard = ({ eyebrow, title, children, aside = null }) => (
  <section className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">{eyebrow}</p>
        <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
      </div>
      {aside}
    </div>
    {children}
  </section>
);

const mapOption = (options, value, fallback = null) => options.find((item) => item.value === value) || fallback;

const buildDefaultValues = ({ contract, propertyId, ownerUserId, ownerOptions, agencyOptions, agentOptions, currentUser }) => {
  const contractType = contract?.contractType === "agent" ? "agent" : "agency";
  const resolvedPropertyId = contract?.propertyId || contract?.coveredProperties?.[0]?.id || propertyId || "";
  const resolvedAgencyId = contract?.agency?.id || (contract?.manager?.role === "agency" ? contract?.manager?.id || "" : "");
  const resolvedAgentId = contract?.agent?.id || (contract?.manager?.role === "independent_agent" ? contract?.manager?.id || "" : "");
  const resolvedAgencyName = contract?.agency?.name || (contract?.manager?.role === "agency" ? contract?.manager?.name || "" : agencyOptions[0]?.label || "");
  const resolvedAgentName =
    contract?.agent?.name || (contract?.manager?.role === "independent_agent" ? contract?.manager?.name || "" : agentOptions[0]?.label || "");
  const resolvedOwnerUserId =
    contract?.owner?.id ||
    contract?.ownerUserId ||
    ownerUserId ||
    (currentUser?.role === "proprietaire" ? currentUser.id : "") ||
    ownerOptions[0]?.value ||
    "";

  return {
    ownerUserId: resolvedOwnerUserId,
    reference: contract?.reference || "",
    contractType: mapOption(contractTypeOptions, contractType, contractTypeOptions[0]),
    status: mapOption(statusOptions, contract?.status, statusOptions[4]),
    propertyId: resolvedPropertyId,
    agencyId: resolvedAgencyId,
    agentId: resolvedAgentId,
    agencyName: resolvedAgencyName,
    agencyCommission: String(contract?.agency?.commission ?? ""),
    agencyFees: String(contract?.agency?.fees ?? ""),
    agentName: resolvedAgentName,
    agentCommission: String(contract?.agent?.commission ?? ""),
    tenants: (contract?.tenants || []).length
      ? contract.tenants.map((tenant) => ({
          tenantId: tenant.tenantId || "",
          fullName: tenant.fullName || "",
          phone: tenant.phone || "",
          email: tenant.email || "",
          isMainTenant: Boolean(tenant.isMainTenant)
        }))
      : [],
    startDate: contract?.startDate ? String(contract.startDate).slice(0, 10) : "",
    endDate: contract?.endDate ? String(contract.endDate).slice(0, 10) : "",
    renewable: Boolean(contract?.renewable),
    noticePeriod: contract?.noticePeriod || "",
    rentAmount: String(contract?.financial?.rentAmount ?? ""),
    charges: String(contract?.financial?.charges ?? ""),
    deposit: String(contract?.financial?.deposit ?? ""),
    currency: contract?.financial?.currency || "XOF",
    paymentFrequency: mapOption(paymentFrequencyOptions, contract?.financial?.paymentFrequency, paymentFrequencyOptions[0]),
    paymentMethod: mapOption(paymentMethodOptions, contract?.financial?.paymentMethod, paymentMethodOptions[0]),
    ownerShare: String(contract?.distribution?.ownerShare ?? ""),
    agencyShare: String(contract?.distribution?.agencyShare ?? ""),
    paymentStatus: mapOption(paymentTrackingStatusOptions, contract?.paymentTracking?.status, paymentTrackingStatusOptions[0]),
    lastPaymentDate: contract?.paymentTracking?.lastPaymentDate ? String(contract.paymentTracking.lastPaymentDate).slice(0, 10) : "",
    nextPaymentDate: contract?.paymentTracking?.nextPaymentDate ? String(contract.paymentTracking.nextPaymentDate).slice(0, 10) : "",
    contractFile: contract?.documentsMeta?.contractFile || "",
    attachmentsText: (contract?.documentsMeta?.attachments || []).join("\n"),
    documentIds: (contract?.documents || []).map((item) => item.id),
    canPublishProperty: Boolean(contract?.actions?.canPublishProperty ?? true),
    canReserveProperty: Boolean(contract?.actions?.canReserveProperty ?? true),
    canEditProperty: Boolean(contract?.actions?.canEditProperty),
    canDeleteProperty: Boolean(contract?.actions?.canDeleteProperty),
    showOwnerNameOnPublication: Boolean(contract?.actions?.publicationOwnerDisplay?.showOwnerName),
    showOwnerContactOnPublication: Boolean(contract?.actions?.publicationOwnerDisplay?.showOwnerContact),
    allowDirectOwnerChatOnPublication: Boolean(contract?.actions?.publicationOwnerDisplay?.allowDirectOwnerChat),
    notes: contract?.notes || "",
    terms: contract?.terms || ""
  };
};

const normalizePayload = (values) => ({
  ownerUserId: values.ownerUserId,
  reference: values.reference.trim(),
  contractType: values.contractType.value,
  status: values.status.value,
  propertyId: values.propertyId || null,
  propertyIds: values.propertyId ? [values.propertyId] : [],
  agencyId: values.contractType.value === "agency" ? values.agencyId || null : null,
  managerUserId: values.contractType.value === "agent" ? values.agentId || null : null,
  agentId: values.contractType.value === "agent" ? values.agentId || null : null,
  agency: values.contractType.value === "agency"
    ? {
        id: values.agencyId || null,
        name: values.agencyName || "",
        commission: Number(values.agencyCommission || 0),
        fees: Number(values.agencyFees || 0)
      }
    : { id: null, name: "", commission: 0, fees: 0 },
  agent: values.contractType.value === "agent"
    ? {
        id: values.agentId || null,
        name: values.agentName || "",
        commission: Number(values.agentCommission || 0),
        fees: 0
      }
    : { id: null, name: "", commission: 0, fees: 0 },
  tenants: (values.tenants || []).map((tenant) => ({
    tenantId: tenant.tenantId || null,
    fullName: tenant.fullName.trim(),
    phone: tenant.phone.trim(),
    email: tenant.email.trim(),
    isMainTenant: Boolean(tenant.isMainTenant)
  })),
  startDate: values.startDate,
  endDate: values.endDate,
  renewable: Boolean(values.renewable),
  noticePeriod: values.noticePeriod || "",
  financial: {
    rentAmount: Number(values.rentAmount || 0),
    charges: Number(values.charges || 0),
    deposit: Number(values.deposit || 0),
    currency: values.currency.trim(),
    paymentFrequency: values.paymentFrequency.value,
    paymentMethod: values.paymentMethod?.value || ""
  },
  distribution: {
    ownerShare: Number(values.ownerShare || 0),
    agencyShare: Number(values.agencyShare || 0)
  },
  paymentTracking: {
    status: values.paymentStatus?.value || "",
    lastPaymentDate: values.lastPaymentDate || null,
    nextPaymentDate: values.nextPaymentDate || null
  },
  documents: {
    contractFile: values.contractFile.trim(),
    attachments: values.attachmentsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
  },
  documentIds: values.documentIds || [],
  actions: {
    canPublishProperty: Boolean(values.canPublishProperty),
    canReserveProperty: Boolean(values.canReserveProperty),
    canEditProperty: Boolean(values.canEditProperty),
    canDeleteProperty: Boolean(values.canDeleteProperty),
    publicationOwnerDisplay: {
      showOwnerName: Boolean(values.showOwnerNameOnPublication),
      showOwnerContact: Boolean(values.showOwnerContactOnPublication),
      allowDirectOwnerChat: Boolean(values.allowDirectOwnerChatOnPublication)
    }
  },
  notes: values.notes.trim(),
  terms: values.terms.trim()
});

export const ModalManageContract = ({
  open,
  mode,
  contract,
  propertyId = "",
  propertyContext = null,
  propertyOptions = [],
  ownerUserId = "",
  ownerOptions = [],
  agencyOptions = [],
  agentOptions = [],
  onUploadDocument,
  onUploadError,
  onClose,
  onSubmit,
  isSaving = false,
  isUploadingDocument = false,
  saveLabel,
  saveDisabled = false,
  footerContent = null
}) => {
  const currentUser = useSelector(selectCurrentUser);
  const fileInputRef = useRef(null);
  const defaultValues = useMemo(
    () => buildDefaultValues({ contract, propertyId, ownerUserId, ownerOptions, agencyOptions, agentOptions, currentUser }),
    [agencyOptions, agentOptions, contract, currentUser, ownerOptions, ownerUserId, propertyId]
  );
  const [selectedDocumentKind, setSelectedDocumentKind] = useState(documentKindOptions[0]);
  const [uploadedDocuments, setUploadedDocuments] = useState(contract?.documents || []);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm({ defaultValues });

  const contractType = watch("contractType");
  const selectedAgencyId = watch("agencyId");
  const selectedPropertyId = watch("propertyId");
  const title = mode === "edit" ? "Modifier le contrat" : "Nouveau contrat";
  const linkedTenants = contract?.linkedTenants || contract?.tenants || [];
  const hasTenants = linkedTenants.length > 0;
  const contractTypeValue = contractType?.value || "agency";
  const selectedPropertyOption = useMemo(() => {
    if (propertyContext?.id && String(propertyContext.id) === String(selectedPropertyId || propertyId || "")) {
      return {
        value: propertyContext.id,
        label: propertyContext.label || "Bien associe",
        purpose: propertyContext.purpose,
        price: propertyContext.price,
        currency: propertyContext.currency
      };
    }

    return (propertyOptions || []).find((item) => item.value === selectedPropertyId) || null;
  }, [propertyContext, propertyId, propertyOptions, selectedPropertyId]);
  const selectedPropertyPurpose = selectedPropertyOption?.purpose || propertyContext?.purpose || "";
  const isSaleProperty = selectedPropertyPurpose === "sale";
  const amountLabel = isSaleProperty ? "Prix de vente" : "Loyer";
  const amountPlaceholder = isSaleProperty ? String(selectedPropertyOption?.price || propertyContext?.price || "") : "";

  const agenciesQuery = useQuery({
    queryKey: ["contract-modal-agencies", currentUser?.id],
    queryFn: () => getAgencyDirectory({ search: "", status: "active", page: 1, limit: 100 }),
    enabled: open && currentUser?.role === "proprietaire"
  });

  const agencyAgentsQuery = useQuery({
    queryKey: ["contract-modal-agency-agents", selectedAgencyId],
    queryFn: () => getAgencyDirectoryAgents({ agencyId: selectedAgencyId, search: "", role: "all" }),
    enabled: open && Boolean(selectedAgencyId) && (currentUser?.role === "proprietaire" || currentUser?.role === "agency" || currentUser?.role === "agency_agent")
  });

  const discoverableAgentsQuery = useQuery({
    queryKey: ["contract-modal-discoverable-agents", currentUser?.id],
    queryFn: () => getDiscoverableAgents({ search: "", agencyType: "all", role: "all", page: 1, limit: 100 }),
    enabled: open && currentUser?.role === "proprietaire"
  });

  const resolvedAgencyOptions = useMemo(() => {
    const seeded = agencyOptions || [];

    if (currentUser?.role !== "proprietaire") {
      return seeded;
    }

    const discovered = (agenciesQuery.data?.items || agenciesQuery.data || []).map((agency) => ({
      label: agency.name || agency.organizationLabel || "Agence",
      value: agency.id || agency.agencyId || ""
    }));

    return [...new Map([...seeded, ...discovered].filter((item) => item?.value).map((item) => [item.value, item])).values()];
  }, [agencyOptions, agenciesQuery.data, currentUser?.role]);

  const resolvedAgentOptions = useMemo(() => {
    const seeded = agentOptions || [];

    if (currentUser?.role === "agency" || currentUser?.role === "agency_agent") {
      const agencyAgents = (agencyAgentsQuery.data?.items || agencyAgentsQuery.data || []).map((agent) => ({
        label: `${agent.label}${agent.email ? ` • ${agent.email}` : ""}`,
        value: agent.id
      }));

      return [...new Map([...seeded, ...agencyAgents].filter((item) => item?.value).map((item) => [item.value, item])).values()];
    }

    if (currentUser?.role === "proprietaire") {
      const discoverableAgents = (discoverableAgentsQuery.data?.items || discoverableAgentsQuery.data || []).map((agent) => ({
        label: `${agent.displayName || agent.label || [agent.firstName, agent.lastName].filter(Boolean).join(" ").trim() || "Agent"}${agent.email ? ` • ${agent.email}` : ""}`,
        value: agent.id || agent.userId || ""
      }));

      return [...new Map([...seeded, ...discoverableAgents].filter((item) => item?.value).map((item) => [item.value, item])).values()];
    }

    return seeded;
  }, [agentOptions, agencyAgentsQuery.data, currentUser?.role, discoverableAgentsQuery.data]);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setUploadedDocuments(contract?.documents || []);
      setSelectedDocumentKind(documentKindOptions[0]);
    }
  }, [contract?.documents, defaultValues, open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (currentUser?.role === "proprietaire" && !watch("ownerUserId")) {
      setValue("ownerUserId", currentUser.id, { shouldDirty: false, shouldValidate: false });
    }
  }, [currentUser, open, setValue, watch]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (contractTypeValue === "agency") {
      setValue("agentId", "", { shouldDirty: true, shouldValidate: false });
      setValue("agentName", "", { shouldDirty: true, shouldValidate: false });
      setValue("agentCommission", "", { shouldDirty: true, shouldValidate: false });

      if (!watch("agencyId") && resolvedAgencyOptions.length === 1) {
        syncSelectedParty("agencyId", resolvedAgencyOptions[0]);
      }
    }

    if (contractTypeValue === "agent") {
      setValue("agencyId", "", { shouldDirty: true, shouldValidate: false });
      setValue("agencyName", "", { shouldDirty: true, shouldValidate: false });
      setValue("agencyCommission", "", { shouldDirty: true, shouldValidate: false });
      setValue("agencyFees", "", { shouldDirty: true, shouldValidate: false });

      if (!watch("agentId") && resolvedAgentOptions.length === 1) {
        syncSelectedParty("agentId", resolvedAgentOptions[0]);
      }
    }
  }, [contractTypeValue, open, resolvedAgencyOptions, resolvedAgentOptions, setValue, watch]);

  useEffect(() => {
    if (!open || !isSaleProperty) {
      return;
    }

    setValue("paymentFrequency", paymentFrequencyOptions.find((item) => item.value === "one_time"), { shouldDirty: true, shouldValidate: true });
    setValue("charges", "0", { shouldDirty: true, shouldValidate: false });
    setValue("deposit", "0", { shouldDirty: true, shouldValidate: false });

    if (!watch("rentAmount") && (selectedPropertyOption?.price || propertyContext?.price)) {
      setValue("rentAmount", String(selectedPropertyOption?.price || propertyContext?.price || ""), { shouldDirty: false, shouldValidate: false });
    }
  }, [isSaleProperty, open, propertyContext?.price, selectedPropertyOption, setValue, watch]);

  const syncSelectedParty = (fieldName, nextValue) => {
    setValue(fieldName, nextValue?.value || "", { shouldDirty: true, shouldValidate: true });

    if (fieldName === "agencyId") {
      setValue("agencyName", nextValue?.label || "", { shouldDirty: true });
    }

    if (fieldName === "agentId") {
      setValue("agentName", nextValue?.label || "", { shouldDirty: true });
    }
  };

  const submitForm = handleSubmit(async (values) => {
    await onSubmit(normalizePayload(values));
  });

  const documentIds = watch("documentIds") || [];
  const contractFilePath = watch("contractFile") || "";

  const pushUploadError = (message, error = null) => {
    if (onUploadError) {
      onUploadError(error || { response: { data: { message } } });
    }
  };

  const handleDocumentUpload = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length || !selectedDocumentKind || !onUploadDocument) {
      event.target.value = "";
      return;
    }

    try {
      const uploadedBatch = [];

      for (const file of files) {
        const uploadedDocument = await onUploadDocument({
          kind: selectedDocumentKind.value,
          contractId: contract?.id || null,
          file
        });

        uploadedBatch.push(uploadedDocument);
      }

      const nextDocuments = [...uploadedBatch.reverse(), ...uploadedDocuments];
      const nextDocumentIds = [...new Set([...documentIds, ...uploadedBatch.map((item) => item.id).filter(Boolean)])];
      const uploadedPaths = uploadedBatch.map((item) => item.publicPath).filter(Boolean);
      const nextAttachments = [
        ...uploadedPaths.filter((item) => item !== contractFilePath),
        ...((watch("attachmentsText") || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean))
      ];

      setUploadedDocuments(nextDocuments);
      setValue("documentIds", nextDocumentIds, { shouldDirty: true, shouldValidate: false });

      if (!contractFilePath && uploadedPaths[0]) {
        setValue("contractFile", uploadedPaths[0], { shouldDirty: true, shouldValidate: false });
      }

      setValue(
        "attachmentsText",
        [...new Set(nextAttachments)].join("\n"),
        { shouldDirty: true, shouldValidate: false }
      );
    } catch (error) {
      pushUploadError(error?.response?.data?.message || "Le televersement des documents a echoue.", error);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <ModalLayout
      open={open}
      title={title}
      onClose={onClose}
      onSave={submitForm}
      saveLabel={saveLabel || (mode === "edit" ? "Mettre a jour" : "Creer le contrat")}
      saveDisabled={saveDisabled}
      isSaving={isSaving}
      panelClassName="max-w-6xl"
      footerContent={footerContent}
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/80">Gestion contractuelle</p>
              <h3 className="text-3xl font-semibold text-white">Un contrat souple, complet et pret a evoluer</h3>
               <p className="max-w-3xl text-sm leading-7 text-stone-300">
                 La fiche contrat centralise les informations juridiques et financieres. Les locataires affiches ici proviennent directement du bien lie.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Statut</p>
                <p className="mt-2 text-lg font-semibold text-white">{watch("status")?.label || "Actif"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Locataires</p>
                <div className="mt-2">
                  {hasTenants ? (
                    <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100">{linkedTenants.length} locataire(s)</Badge>
                  ) : (
                    <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-100">Sans locataire</Badge>
                  )}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Rappel UX</p>
                <p className="mt-2 text-sm text-stone-300">Les locataires sont en lecture seule dans ce modal et se gerent depuis le bien ou l'espace proprietaire.</p>
              </div>
            </div>
          </div>
        </section>

        <SectionCard eyebrow="Section 1" title="Informations generales">
          <div className="grid gap-4 lg:grid-cols-2">
            {ownerOptions.length ? (
              <Controller
                name="ownerUserId"
                control={control}
                rules={{ required: "Le proprietaire est requis." }}
                render={({ field }) => (
                  <BaseListBox
                    label="Proprietaire"
                    options={ownerOptions}
                    value={ownerOptions.find((item) => item.value === field.value) || null}
                    onChange={(nextValue) => field.onChange(nextValue?.value || "")}
                    error={errors.ownerUserId?.message}
                    placeholder="Selectionner le proprietaire"
                  />
                )}
              />
            ) : (
              <Controller name="ownerUserId" control={control} render={({ field }) => <input type="hidden" {...field} />} />
            )}
            <Controller
              name="reference"
              control={control}
              rules={{ required: "La reference est requise." }}
              render={({ field }) => <Input label="Reference" placeholder="CTR-2026-001" error={errors.reference?.message} {...field} />}
            />
            <Controller
              name="contractType"
              control={control}
              rules={{ required: "Le type est requis." }}
              render={({ field }) => (
                <BaseListBox label="Type de contrat" options={contractTypeOptions} value={field.value} onChange={field.onChange} error={errors.contractType?.message} />
              )}
            />
            <Controller
              name="status"
              control={control}
              rules={{ required: "Le statut est requis." }}
              render={({ field }) => <BaseListBox label="Statut" options={statusOptions} value={field.value} onChange={field.onChange} error={errors.status?.message} />}
            />
            {propertyOptions.length ? (
              <Controller
                name="propertyId"
                control={control}
                render={({ field }) => (
                  <BaseListBox
                    label="Bien associe"
                    options={propertyOptions}
                    value={propertyOptions.find((item) => item.value === field.value) || null}
                    onChange={(nextValue) => field.onChange(nextValue?.value || "")}
                    placeholder="Selectionner le bien"
                  />
                )}
              />
            ) : (
              <>
                <Controller
                  name="propertyId"
                  control={control}
                  render={({ field }) => <input type="hidden" {...field} />}
                />
                <Input
                  label="Bien associe"
                  readOnly
                  value={propertyContext?.label || propertyId || ""}
                  className="cursor-default bg-stone-950/90 text-stone-200"
                />
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 2" title={contractTypeValue === "agency" ? "Agence" : "Agent"}>
          {contractTypeValue === "agency" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Controller
                name="agencyId"
                control={control}
                rules={{ required: "L'agence est requise." }}
                render={({ field }) => (
                  <BaseListBox
                    label="Agence"
                    options={resolvedAgencyOptions}
                    value={resolvedAgencyOptions.find((item) => item.value === field.value) || null}
                    onChange={(nextValue) => syncSelectedParty(field.name, nextValue)}
                    error={errors.agencyId?.message}
                    placeholder={agenciesQuery.isLoading ? "Chargement des agences..." : "Selectionner l'agence"}
                  />
                )}
              />
              <Controller
                name="agencyName"
                control={control}
                render={({ field }) => <Input label="Nom" readOnly className="cursor-default bg-stone-950/90 text-stone-200" {...field} />}
              />
              <Controller name="agencyCommission" control={control} render={({ field }) => <Input label="Commission" type="number" placeholder="10" {...field} />} />
              <Controller name="agencyFees" control={control} render={({ field }) => <Input label="Frais" type="number" placeholder="50000" {...field} />} />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Controller
                name="agentId"
                control={control}
                rules={{ required: "L'agent est requis." }}
                render={({ field }) => (
                  <BaseListBox
                    label="Agent"
                    options={resolvedAgentOptions}
                    value={resolvedAgentOptions.find((item) => item.value === field.value) || null}
                    onChange={(nextValue) => syncSelectedParty(field.name, nextValue)}
                    error={errors.agentId?.message}
                    placeholder={agencyAgentsQuery.isLoading || discoverableAgentsQuery.isLoading ? "Chargement des agents..." : "Selectionner l'agent"}
                  />
                )}
              />
              <Controller
                name="agentName"
                control={control}
                render={({ field }) => <Input label="Nom" readOnly className="cursor-default bg-stone-950/90 text-stone-200" {...field} />}
              />
              <Controller name="agentCommission" control={control} render={({ field }) => <Input label="Commission" type="number" placeholder="10" {...field} />} />
            </div>
          )}
        </SectionCard>

        <SectionCard eyebrow="Section 3" title="Locataires lies au bien">
          <div className={`rounded-[1.4rem] border p-4 ${hasTenants ? "border-white/10 bg-stone-950/40" : "border-dashed border-amber-400/30 bg-amber-500/5"}`}>
            <p className="text-sm text-stone-300">Cette section est synchronisee automatiquement avec les locataires reellement rattaches au bien.</p>
            {!hasTenants ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-amber-100/80">Aucun locataire lie pour le moment</p> : null}
          </div>

          <div className="mt-4 space-y-4">
            {linkedTenants.map((tenant, index) => (
              <div key={tenant.id || tenant.tenantId || `${tenant.fullName}-${index}`} className="rounded-[1.5rem] border border-white/10 bg-stone-950/45 p-4">
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
                  <Input label="Nom complet" value={tenant.fullName || ""} readOnly className="cursor-default bg-stone-950/90 text-stone-200" />
                  <Input label="Telephone" value={tenant.phone || ""} readOnly className="cursor-default bg-stone-950/90 text-stone-200" />
                  <Input label="Email" value={tenant.email || ""} readOnly className="cursor-default bg-stone-950/90 text-stone-200" />
                  <Input label="CIN" value={tenant.cin || ""} readOnly className="cursor-default bg-stone-950/90 text-stone-200" />
                  <Input label="Sexe" value={tenant.sexe || ""} readOnly className="cursor-default bg-stone-950/90 text-stone-200" />
                </div>
                {tenant.adresse ? (
                  <div className="mt-4">
                    <Input label="Adresse" value={tenant.adresse} readOnly className="cursor-default bg-stone-950/90 text-stone-200" />
                  </div>
                ) : null}
                <div className="mt-4">
                  <Badge className={index === 0 ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-stone-200"}>
                    {index === 0 ? "Locataire principal" : "Locataire associe"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 4" title="Details du contrat">
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller
              name="startDate"
              control={control}
              rules={{ required: "La date de debut est requise." }}
              render={({ field }) => <Input label="Date de debut" type="date" error={errors.startDate?.message} {...field} />}
            />
            <Controller
              name="endDate"
              control={control}
              rules={{
                required: "La date de fin est requise.",
                validate: (value) => !watch("startDate") || value > watch("startDate") || "La date de fin doit etre apres la date de debut."
              }}
              render={({ field }) => <Input label="Date de fin" type="date" error={errors.endDate?.message} {...field} />}
            />
            <Controller
              name="renewable"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Renouvelable
                </label>
              )}
            />
            <Controller name="noticePeriod" control={control} render={({ field }) => <Input label="Preavis" placeholder="30 jours" {...field} />} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 5" title="Financier">
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller
              name="rentAmount"
              control={control}
              rules={{ required: isSaleProperty ? "Le prix est requis." : "Le loyer est requis." }}
              render={({ field }) => <Input label={amountLabel} type="number" placeholder={amountPlaceholder} error={errors.rentAmount?.message} {...field} />}
            />
            <Controller
              name="charges"
              control={control}
              render={({ field }) => <Input label="Charges" type="number" disabled={isSaleProperty} className={isSaleProperty ? "cursor-not-allowed bg-stone-950/90 text-stone-500" : undefined} {...field} />}
            />
            <Controller
              name="deposit"
              control={control}
              render={({ field }) => <Input label="Depot de garantie" type="number" disabled={isSaleProperty} className={isSaleProperty ? "cursor-not-allowed bg-stone-950/90 text-stone-500" : undefined} {...field} />}
            />
            <Controller
              name="currency"
              control={control}
              rules={{ required: "La devise est requise." }}
              render={({ field }) => <Input label="Devise" error={errors.currency?.message} {...field} />}
            />
            <Controller
              name="paymentFrequency"
              control={control}
              rules={{ required: "La frequence est requise." }}
              render={({ field }) => (
                <BaseListBox
                  label="Frequence de paiement"
                  options={isSaleProperty ? paymentFrequencyOptions.filter((item) => item.value === "one_time") : paymentFrequencyOptions.filter((item) => item.value !== "one_time")}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.paymentFrequency?.message}
                  disabled={isSaleProperty}
                />
              )}
            />
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Methode de paiement"
                  options={paymentMethodOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selectionner une methode"
                />
              )}
            />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 6" title="Distribution">
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller name="ownerShare" control={control} render={({ field }) => <Input label="Part proprietaire" type="number" placeholder="80" {...field} />} />
            <Controller name="agencyShare" control={control} render={({ field }) => <Input label="Part agence" type="number" placeholder="20" {...field} />} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 7" title="Suivi paiement">
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller
              name="paymentStatus"
              control={control}
              render={({ field }) => <BaseListBox label="Statut de paiement" options={paymentTrackingStatusOptions} value={field.value} onChange={field.onChange} />}
            />
            <Controller name="lastPaymentDate" control={control} render={({ field }) => <Input label="Dernier paiement" type="date" {...field} />} />
            <Controller name="nextPaymentDate" control={control} render={({ field }) => <Input label="Prochain paiement" type="date" {...field} />} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 8" title="Documents">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-stone-950/40 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Televersement des documents</p>
                  <p className="mt-1 text-xs text-stone-400">Les fichiers sont stockes dans `uploads/contracts` et vous pouvez en televerser plusieurs d'un coup.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[220px]">
                    <BaseListBox options={documentKindOptions} value={selectedDocumentKind} onChange={setSelectedDocumentKind} placeholder="Categorie" />
                  </div>
                  <Button type="button" variant="secondary" className="px-4 py-2" disabled={isUploadingDocument} onClick={() => fileInputRef.current?.click()}>
                    {isUploadingDocument ? "Televersement..." : "Televerser des documents"}
                  </Button>
                </div>
              </div>

              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleDocumentUpload} disabled={isUploadingDocument} />

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {uploadedDocuments.map((document) => (
                  <div key={document.id} className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{document.originalName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">{document.kindLabel}</p>
                      </div>
                      <a href={document.publicPath} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.2em] text-brand-100">
                        Ouvrir
                      </a>
                    </div>
                  </div>
                ))}
                {!uploadedDocuments.length ? (
                  <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-stone-400 lg:col-span-2">
                    Aucun document televerse pour le moment.
                  </div>
                ) : null}
              </div>
            </div>
            <Controller
              name="contractFile"
              control={control}
              render={({ field }) => <Input label="Fichier principal du contrat" placeholder="/uploads/contracts/contrat.pdf" className="cursor-default bg-stone-950/90 text-stone-200" readOnly {...field} />}
            />
            <Controller
              name="attachmentsText"
              control={control}
              render={({ field }) => (
                <TextareaField
                  label="Attachments"
                  placeholder={"Une piece par ligne\n/uploads/contracts/annexe-1.pdf"}
                  className="min-h-32"
                  {...field}
                />
              )}
            />
            <Controller name="documentIds" control={control} render={({ field }) => <input type="hidden" {...field} />} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 9" title="Actions disponibles">
          <div className="grid gap-3 lg:grid-cols-2">
            <Controller
              name="canPublishProperty"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Publier le bien
                </label>
              )}
            />
            <Controller
              name="canReserveProperty"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Reserver le bien
                </label>
              )}
            />
            <Controller
              name="canEditProperty"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Modifier le bien
                </label>
              )}
            />
            <Controller
              name="canDeleteProperty"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Supprimer le bien
                </label>
              )}
            />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 10" title="Affichage du proprietaire lors de publication du bien">
          <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-stone-300">
              Activez les informations du proprietaire a afficher dans la publication du bien. La photo de profil sera affichee automatiquement quand au moins une option est activee.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Controller
              name="showOwnerNameOnPublication"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Nom du proprietaire
                </label>
              )}
            />
            <Controller
              name="showOwnerContactOnPublication"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Contact du proprietaire
                </label>
              )}
            />
            <Controller
              name="allowDirectOwnerChatOnPublication"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-200">
                  <input type="checkbox" checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />
                  Discuter avec le proprietaire directement
                </label>
              )}
            />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Section 11" title="Notes">
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller name="notes" control={control} render={({ field }) => <TextareaField label="Notes" placeholder="Contexte, suivi, actions a mener..." {...field} />} />
            <Controller name="terms" control={control} render={({ field }) => <TextareaField label="Conditions" placeholder="Conditions principales, clauses, obligations..." {...field} />} />
          </div>
        </SectionCard>
      </form>
    </ModalLayout>
  );
};
