import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Textarea } from "../../../components/ui/Textarea.jsx";

const REPAIR_OPTIONS_BY_PROPERTY_TYPE = {
  land: [
    { key: "perimeterFence", fallback: "Cloture perimetrique" },
    { key: "landLeveling", fallback: "Nivellement du terrain" },
    { key: "landDrainage", fallback: "Drainage du terrain" },
    { key: "clearing", fallback: "Debroussaillage" },
    { key: "markingAccess", fallback: "Balisage et acces" }
  ],
  house: [
    { key: "plumbingLeak", fallback: "Fuite plomberie" },
    { key: "interiorPainting", fallback: "Peinture interieure" },
    { key: "roofRepair", fallback: "Reparation toiture" },
    { key: "electricalInstallation", fallback: "Installation electrique" },
    { key: "wallHumidity", fallback: "Humidite murale" },
    { key: "doorsWindows", fallback: "Menuiserie portes/fenetres" }
  ],
  apartment: [
    { key: "waterHeater", fallback: "Chauffe-eau" },
    { key: "bathroomLeak", fallback: "Fuite salle de bain" },
    { key: "lockAccess", fallback: "Serrure et acces" },
    { key: "airConditioning", fallback: "Climatisation" },
    { key: "socketsLights", fallback: "Prises et luminaires" },
    { key: "tileRepair", fallback: "Reparation carrelage" }
  ]
};

const DEFAULT_REPAIR_OPTIONS = [
  { key: "technicalCleaning", fallback: "Nettoyage technique" },
  { key: "generalCheck", fallback: "Controle general" },
  { key: "smallRepair", fallback: "Petite reparation" }
];

const buildTicketSchema = (t, { descriptionRequired = false } = {}) => z.object({
  managedPropertyId: z.string().trim().min(1, t("private", "owner.maintenance.validation.property", "Le bien est requis")),
  titleSelections: z.array(z.object({
    value: z.string(),
    label: z.string()
  })).min(1, t("private", "owner.maintenance.validation.title", "Selectionnez au moins une reparation")),
  description: descriptionRequired
    ? z.string().trim().min(10, t("private", "owner.maintenance.validation.description", "Le detail doit contenir au moins 10 caracteres")).max(5000)
    : z.string().trim().max(5000).default(""),
  priority: z.enum(["high", "medium", "low"]),
  assignee: z.string().trim().max(255).default(""),
  status: z.enum(["planned", "in_progress", "closed"]),
  maintenanceAmount: z.coerce.number().min(0, t("private", "owner.maintenance.validation.amount", "Le prix total doit etre positif")).default(0),
  currency: z.string().trim().min(2).max(8),
  lastUpdateAt: z.string().trim().min(1, t("private", "owner.maintenance.validation.lastUpdate", "La date de mise a jour est requise"))
});

const mapOptionGroup = (items, t) =>
  items.map((item) => {
    const label = t("private", `owner.maintenance.repairs.${item.key}`, item.fallback);
    return { value: label, label };
  });

export const ModalManageTicket = ({
  open,
  mode = "create",
  ticket = null,
  propertyOptions = [],
  propertySelectDisabled = false,
  showOwnerFields = true,
  descriptionRequired = false,
  titleOverride = "",
  saveLabelOverride = "",
  onClose,
  onSubmit,
  isSaving = false
}) => {
  const { preferences, t } = useUserPreferences();
  const preferredCurrency = String(preferences.currency || "USD").toUpperCase();
  const ticketSchema = useMemo(() => buildTicketSchema(t, { descriptionRequired }), [descriptionRequired, t]);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      managedPropertyId: "",
      titleSelections: [],
      description: "",
      priority: "medium",
      assignee: "",
      status: "planned",
      maintenanceAmount: 0,
      currency: preferredCurrency,
      lastUpdateAt: new Date().toISOString().slice(0, 10)
    }
  });

  useEffect(() => {
    const fallbackPropertyId = propertyOptions.length === 1 || propertySelectDisabled
      ? propertyOptions[0]?.value || ""
      : "";

    reset({
      managedPropertyId: ticket?.managedPropertyId || fallbackPropertyId,
      titleSelections: (ticket?.titleSelections || []).map((item) => ({ value: item, label: item })),
      description: ticket?.description || "",
      priority: ticket?.priorityValue || "medium",
      assignee: ticket?.assignee === "-" ? "" : ticket?.assignee || "",
      status: ticket?.statusValue || "planned",
      maintenanceAmount: Number(ticket?.maintenanceAmount ?? 0),
      currency: preferredCurrency,
      lastUpdateAt: ticket?.lastUpdateAt ? new Date(ticket.lastUpdateAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
  }, [open, preferredCurrency, propertyOptions, propertySelectDisabled, ticket, reset]);

  const managedPropertyId = watch("managedPropertyId");

  const selectedProperty = useMemo(
    () => propertyOptions.find((option) => option.value === managedPropertyId) || null,
    [managedPropertyId, propertyOptions]
  );
  const repairOptions = useMemo(
    () => mapOptionGroup(REPAIR_OPTIONS_BY_PROPERTY_TYPE[selectedProperty?.type] || DEFAULT_REPAIR_OPTIONS, t),
    [selectedProperty?.type, t]
  );
  const priorityOptions = useMemo(() => [
    { value: "high", label: t("private", "priorities.high", "Haute") },
    { value: "medium", label: t("private", "priorities.medium", "Moyenne") },
    { value: "low", label: t("private", "priorities.low", "Basse") }
  ], [t]);
  const statusOptions = useMemo(() => [
    { value: "planned", label: t("private", "owner.maintenance.status.planned", "Planifie") },
    { value: "in_progress", label: t("private", "owner.maintenance.status.inProgress", "En cours") },
    { value: "closed", label: t("private", "owner.maintenance.status.closed", "Cloture") }
  ], [t]);

  const title = titleOverride || (mode === "edit"
    ? t("private", "owner.maintenance.modal.editTitle", "Modifier le ticket")
    : t("private", "owner.maintenance.modal.createTitle", "Nouveau ticket"));
  const saveLabel = saveLabelOverride || (mode === "edit"
    ? t("private", "owner.maintenance.modal.save", "Enregistrer")
    : t("private", "owner.maintenance.modal.create", "Creer"));

  return (
    <ModalLayout
      open={open}
      title={title}
      onClose={onClose}
      onSave={handleSubmit((values) =>
        onSubmit({
          ...values,
          title: values.titleSelections.map((item) => item.value).join(", "),
          propertyLabel: selectedProperty?.label || "",
          maintenanceAmount: Number(values.maintenanceAmount || 0),
          currency: preferredCurrency
        })
      )}
      saveLabel={saveLabel}
      cancelLabel={t("private", "common.cancel", "Annuler")}
      isSaving={isSaving}
      saveDisabled={!propertyOptions.length}
    >
      <div className="space-y-5">
        <Controller
          name="managedPropertyId"
          control={control}
          render={({ field }) => (
            <BaseListBox
              label={t("private", "owner.maintenance.fields.property", "Bien concerne")}
              options={propertyOptions}
              value={propertyOptions.find((option) => option.value === field.value) || null}
              onChange={(option) => field.onChange(option?.value || "")}
              placeholder={propertyOptions.length
                ? t("private", "owner.maintenance.placeholders.property", "Selectionner un bien")
                : t("private", "owner.maintenance.placeholders.noProperty", "Aucun bien disponible")}
              error={errors.managedPropertyId?.message}
              disabled={!propertyOptions.length || propertySelectDisabled}
            />
          )}
        />

        <div className={`grid gap-4 ${showOwnerFields ? "md:grid-cols-2" : ""}`.trim()}>
          <Controller
            name="titleSelections"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label={t("private", "owner.maintenance.fields.ticketTitle", "Titre du ticket")}
                options={repairOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder={t("private", "owner.maintenance.placeholders.repair", "Selectionner une ou plusieurs reparations")}
                error={errors.titleSelections?.message}
                multiple
                disabled={!selectedProperty}
              />
            )}
          />
          {showOwnerFields ? (
            <Controller
              name="assignee"
              control={control}
              render={({ field }) => (
                <Input
                  label={t("private", "owner.maintenance.fields.assignee", "Intervenant")}
                  placeholder={t("private", "owner.maintenance.placeholders.assignee", "Entreprise ou technicien")}
                  error={errors.assignee?.message}
                  {...field}
                />
              )}
            />
          ) : null}
        </div>

        <div className={`grid gap-4 ${showOwnerFields ? "md:grid-cols-3" : ""}`.trim()}>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label={t("private", "owner.maintenance.fields.priority", "Priorite")}
                options={priorityOptions}
                value={priorityOptions.find((option) => option.value === field.value) || null}
                onChange={(option) => field.onChange(option?.value || "medium")}
                error={errors.priority?.message}
              />
            )}
          />
          {showOwnerFields ? (
            <>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <BaseListBox
                    label={t("private", "owner.maintenance.fields.status", "Statut")}
                    options={statusOptions}
                    value={statusOptions.find((option) => option.value === field.value) || null}
                    onChange={(option) => field.onChange(option?.value || "planned")}
                    error={errors.status?.message}
                  />
                )}
              />
              <Controller
                name="lastUpdateAt"
                control={control}
                render={({ field }) => (
                  <Input
                    label={t("private", "owner.maintenance.fields.lastUpdate", "Derniere mise a jour")}
                    type="date"
                    error={errors.lastUpdateAt?.message}
                    {...field}
                  />
                )}
              />
            </>
          ) : null}
        </div>

        {showOwnerFields ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <Controller
              name="maintenanceAmount"
              control={control}
              render={({ field }) => (
                <Input
                  label={t("private", "owner.maintenance.fields.totalPrice", "Prix total de l'entretien")}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  error={errors.maintenanceAmount?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <Input
                  label={t("private", "owner.maintenance.fields.currency", "Devise")}
                  readOnly
                  className="cursor-default bg-stone-950/90 text-stone-200"
                  error={errors.currency?.message}
                  {...field}
                />
              )}
            />
          </div>
        ) : null}

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              label={t("private", "owner.maintenance.fields.details", "Details")}
              placeholder={t("private", "owner.maintenance.placeholders.details", "Precisez le contexte, l'urgence et ce qui doit etre traite.")}
              rows={5}
              error={errors.description?.message}
              {...field}
            />
          )}
        />
      </div>
    </ModalLayout>
  );
};
