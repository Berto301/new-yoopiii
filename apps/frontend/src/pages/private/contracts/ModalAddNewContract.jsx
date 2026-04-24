import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Button } from "../../../components/ui/Button.jsx";

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
  { label: "Mandat de gestion locative", value: "Mandat de gestion locative" },
  { label: "Mandat exclusif", value: "Mandat exclusif" },
  { label: "Mandat simple", value: "Mandat simple" },
  { label: "Convention de gestion", value: "Convention de gestion" },
  { label: "Autre contrat", value: "Autre contrat" }
];

const mandateTypeOptions = [
  { label: "Location", value: "Location" },
  { label: "Gestion complete", value: "Gestion complete" },
  { label: "Mise en location", value: "Mise en location" },
  { label: "Commercialisation", value: "Commercialisation" }
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

const contractSchema = z.object({
  reference: z.string().min(3, "Reference requise"),
  contractType: z.object({ label: z.string(), value: z.string() }),
  status: z.object({ label: z.string(), value: z.string() }),
  signatureDate: z.string().optional(),
  startDate: z.string().min(1, "Date de debut requise"),
  endDate: z.string().min(1, "Date de fin requise"),
  renewalDate: z.string().optional(),
  ownerOption: z.object({ label: z.string(), value: z.string() }),
  responsibleAgentOption: z.object({ label: z.string(), value: z.string() }).nullable(),
  propertyOptions: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  mandateType: z.object({ label: z.string(), value: z.string() }).nullable(),
  propertyReference: z.string().optional(),
  mission: z.string().optional(),
  commission: z.string().optional(),
  paymentConditions: z.string().optional(),
  noticePeriod: z.string().optional(),
  terminationConditions: z.string().optional(),
  specialClauses: z.string().optional(),
  legalFramework: z.string().optional(),
  jurisdiction: z.string().optional(),
  documentIds: z.array(z.string()).default([])
});

const mapContractToValues = (contract, ownerOptions, propertyOptions = [], agentOptions = [], userPreferences = {}) => ({
  reference: contract?.reference || "",
  contractType: contractTypeOptions.find((item) => item.value === contract?.contractType) || contractTypeOptions[0],
  status: statusOptions.find((item) => item.value === contract?.status) || statusOptions[0],
  signatureDate: contract?.signatureDate ? String(contract.signatureDate).slice(0, 10) : "",
  startDate: contract?.startDate ? String(contract.startDate).slice(0, 10) : "",
  endDate: contract?.endDate ? String(contract.endDate).slice(0, 10) : "",
  renewalDate: contract?.renewalDate ? String(contract.renewalDate).slice(0, 10) : "",
  ownerOption: ownerOptions.find((item) => item.value === contract?.owner?.id) || ownerOptions[0] || null,
  responsibleAgentOption: agentOptions.find((item) => item.value === contract?.responsibleAgent?.id) || agentOptions[0] || null,
  propertyOptions: propertyOptions.filter((item) => (contract?.coveredProperties || []).some((property) => property.id === item.value)),
  mandateType: mandateTypeOptions.find((item) => item.value === contract?.mandateType) || null,
  propertyReference: contract?.propertyReference || "",
  mission: contract?.mission || "",
  commission: contract?.commission || (userPreferences.contractDefaultCommission ? String(userPreferences.contractDefaultCommission) : ""),
  paymentConditions: contract?.paymentConditions || "",
  noticePeriod: contract?.noticePeriod || "",
  terminationConditions: contract?.terminationConditions || "",
  specialClauses: contract?.specialClauses || "",
  legalFramework: contract?.legalFramework || "",
  jurisdiction: contract?.jurisdiction || "",
  documentIds: (contract?.documents || []).map((item) => item.id)
});

const normalizeContractPayload = (values) => ({
  reference: values.reference.trim(),
  contractType: values.contractType.value,
  status: values.status.value,
  signatureDate: values.signatureDate || null,
  startDate: values.startDate,
  endDate: values.endDate,
  renewalDate: values.renewalDate || null,
  ownerUserId: values.ownerOption.value,
  responsibleAgentUserId: values.responsibleAgentOption?.value || null,
  propertyIds: (values.propertyOptions || []).map((item) => item.value),
  mandateType: values.mandateType?.value || "",
  propertyReference: values.propertyReference || "",
  mission: values.mission || "",
  commission: values.commission || "",
  paymentConditions: values.paymentConditions || "",
  noticePeriod: values.noticePeriod || "",
  terminationConditions: values.terminationConditions || "",
  specialClauses: values.specialClauses || "",
  legalFramework: values.legalFramework || "",
  jurisdiction: values.jurisdiction || "",
  documentIds: values.documentIds || []
});

const TextareaField = ({ label, value, onChange, error, placeholder }) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-stone-200">{label}</span>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="min-h-28 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
    />
    {error ? <span className="text-xs text-red-300">{error}</span> : null}
  </label>
);

export const ModalAddNewContract = ({
  open,
  mode,
  contract,
  ownerOptions = [],
  propertyOptions = [],
  agentOptions = [],
  onClose,
  onSubmit,
  onUploadDocument,
  isSaving = false,
  isUploadingDocument = false
}) => {
  const currentUser = useSelector(selectCurrentUser);
  const fileInputRef = useRef(null);
  const [selectedDocumentKind, setSelectedDocumentKind] = useState(documentKindOptions[0]);
  const [documents, setDocuments] = useState(contract?.documents || []);
  const defaultValues = useMemo(
    () => mapContractToValues(contract, ownerOptions, propertyOptions, agentOptions, currentUser?.preferences || {}),
    [agentOptions, contract, currentUser?.preferences, ownerOptions, propertyOptions]
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setDocuments(contract?.documents || []);
      setSelectedDocumentKind(documentKindOptions[0]);
    }
  }, [contract?.documents, defaultValues, open, reset]);

  const documentIds = watch("documentIds") || [];
  const title = mode === "edit" ? "Modifier le contrat" : "Nouveau contrat";

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !selectedDocumentKind) {
      return;
    }

    try {
      const uploadedDocument = await onUploadDocument({
        kind: selectedDocumentKind.value,
        contractId: contract?.id || null,
        file
      });

      const nextDocuments = [uploadedDocument, ...documents];
      setDocuments(nextDocuments);
      setValue("documentIds", [...new Set([...documentIds, uploadedDocument.id])], { shouldDirty: true, shouldValidate: false });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <ModalLayout
      open={open}
      title={title}
      onClose={onClose}
      onSave={handleSubmit(async (values) => {
        await onSubmit(normalizeContractPayload(values));
      })}
      saveLabel={mode === "edit" ? "Mettre a jour" : "Creer le contrat"}
      isSaving={isSaving}
      panelClassName="max-w-6xl"
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/80">Cadre contractuel</p>
              <h3 className="text-3xl font-semibold text-white">Un contrat juridiquement structure et documente</h3>
              <p className="max-w-3xl text-sm leading-7 text-stone-300">
                Centralisez le proprietaire, le mandat, les dates critiques, les conditions juridiques, les documents d'identite et les pieces du bien dans une seule interface plus sobre et plus professionnelle.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Statut</p>
                <p className="mt-2 text-lg font-semibold text-white">{watch("status")?.label || "Brouillon"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Documents</p>
                <p className="mt-2 text-lg font-semibold text-white">{documents.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Proprietaire cible</p>
                <p className="mt-2 text-lg font-semibold text-white">{watch("ownerOption")?.label || "A selectionner"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Informations generales</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Structure, statut et dates du contrat</h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller name="reference" control={control} render={({ field }) => <Input label="Reference contrat" error={errors.reference?.message} placeholder="CTR-2026-001" {...field} />} />
            <Controller name="contractType" control={control} render={({ field }) => <BaseListBox label="Type contrat" options={contractTypeOptions} value={field.value} onChange={field.onChange} error={errors.contractType?.message} />} />
            <Controller name="status" control={control} render={({ field }) => <BaseListBox label="Statut" options={statusOptions} value={field.value} onChange={field.onChange} error={errors.status?.message} />} />
            <Controller
              name="mandateType"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Type de mandat"
                  options={mandateTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selectionner"
                />
              )}
            />
            <Controller name="signatureDate" control={control} render={({ field }) => <Input label="Date signature" type="date" {...field} />} />
            <Controller name="startDate" control={control} render={({ field }) => <Input label="Date debut" type="date" error={errors.startDate?.message} {...field} />} />
            <Controller name="endDate" control={control} render={({ field }) => <Input label="Date fin" type="date" error={errors.endDate?.message} {...field} />} />
            <Controller name="renewalDate" control={control} render={({ field }) => <Input label="Renouvellement" type="date" {...field} />} />
            <Controller name="commission" control={control} render={({ field }) => <Input label="Commission / honoraires" placeholder="8% HT ou 500 000 Ar" {...field} />} />
            <Controller name="noticePeriod" control={control} render={({ field }) => <Input label="Preavis" placeholder="60 jours" {...field} />} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Parties contractantes</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Proprietaire et gestionnaire responsable</h3>
            </div>
            <div className="grid gap-4">
              <Controller
                name="ownerOption"
                control={control}
                render={({ field }) => (
                  <BaseListBox
                    label="Proprietaire"
                    options={ownerOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.ownerOption?.message}
                    placeholder="Selectionner le proprietaire"
                  />
                )}
              />
              <Controller
                name="responsibleAgentOption"
                control={control}
                render={({ field }) => (
                  <BaseListBox
                    label="Agent responsable"
                    options={agentOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.responsibleAgentOption?.message}
                    placeholder="Selectionner l'agent responsable"
                  />
                )}
              />
              <Controller name="propertyReference" control={control} render={({ field }) => <Input label="Reference interne bien / lot" placeholder="Residence Palmier - Lot A12" {...field} />} />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Biens associes</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Selection multiple des biens couverts</h3>
            </div>
            <Controller
              name="propertyOptions"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Biens lies au contrat"
                  options={propertyOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.propertyOptions?.message}
                  placeholder="Selectionner un ou plusieurs biens"
                  multiple
                />
              )}
            />
            <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-stone-950/50 p-4 text-sm text-stone-300">
              {(watch("propertyOptions") || []).length
                ? `${watch("propertyOptions").length} bien(s) actuellement rattache(s) au contrat.`
                : "Aucun bien selectionne pour le moment."}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Controller name="mission" control={control} render={({ field }) => <TextareaField label="Mission" placeholder="Commercialisation, visites, selection des locataires, suivi administratif..." error={errors.mission?.message} {...field} />} />
          <Controller name="paymentConditions" control={control} render={({ field }) => <TextareaField label="Conditions de paiement" placeholder="Paiement mensuel, echeance au 5 de chaque mois..." error={errors.paymentConditions?.message} {...field} />} />
          <Controller name="terminationConditions" control={control} render={({ field }) => <TextareaField label="Conditions de resiliation" placeholder="Resiliation avec preavis, faute grave, inexécution..." error={errors.terminationConditions?.message} {...field} />} />
          <Controller name="specialClauses" control={control} render={({ field }) => <TextareaField label="Clauses particulieres" placeholder="Clauses specifiques au mandat, exclusivite, delegation..." error={errors.specialClauses?.message} {...field} />} />
          <Controller name="legalFramework" control={control} render={({ field }) => <TextareaField label="Cadre legal" placeholder="Reference des textes applicables, obligations des parties..." error={errors.legalFramework?.message} {...field} />} />
          <Controller name="jurisdiction" control={control} render={({ field }) => <TextareaField label="Juridiction" placeholder="Tribunal competent, mediation, droit applicable..." error={errors.jurisdiction?.message} {...field} />} />
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Documents associes</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Pieces proprietaire, agence, bien et annexes</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[220px]">
                <BaseListBox options={documentKindOptions} value={selectedDocumentKind} onChange={setSelectedDocumentKind} placeholder="Categorie" />
              </div>
              <Button type="button" variant="secondary" disabled={isUploadingDocument} onClick={() => fileInputRef.current?.click()}>
                {isUploadingDocument ? "Televersement..." : "Ajouter un document"}
              </Button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleDocumentUpload} />

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {documents.map((document) => (
              <div key={document.id} className="rounded-[1.4rem] border border-white/10 bg-stone-950/50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{document.originalName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">{document.kindLabel}</p>
                  </div>
                  <a href={document.publicPath} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.2em] text-brand-100">
                    Ouvrir
                  </a>
                </div>
              </div>
            ))}
            {!documents.length ? (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-stone-950/40 px-4 py-8 text-sm text-stone-400 lg:col-span-2">
                Aucun document charge pour le moment.
              </div>
            ) : null}
          </div>
        </section>
      </form>
    </ModalLayout>
  );
};
