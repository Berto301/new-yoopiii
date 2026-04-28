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
    { value: "Cloture perimetrique", label: "Cloture perimetrique" },
    { value: "Nivellement du terrain", label: "Nivellement du terrain" },
    { value: "Drainage du terrain", label: "Drainage du terrain" },
    { value: "Debroussaillage", label: "Debroussaillage" },
    { value: "Balisage et acces", label: "Balisage et acces" }
  ],
  house: [
    { value: "Fuite plomberie", label: "Fuite plomberie" },
    { value: "Peinture interieure", label: "Peinture interieure" },
    { value: "Reparation toiture", label: "Reparation toiture" },
    { value: "Installation electrique", label: "Installation electrique" },
    { value: "Humidite murale", label: "Humidite murale" },
    { value: "Menuiserie portes/fenetres", label: "Menuiserie portes/fenetres" }
  ],
  apartment: [
    { value: "Chauffe-eau", label: "Chauffe-eau" },
    { value: "Fuite salle de bain", label: "Fuite salle de bain" },
    { value: "Serrure et acces", label: "Serrure et acces" },
    { value: "Climatisation", label: "Climatisation" },
    { value: "Prises et luminaires", label: "Prises et luminaires" },
    { value: "Reparation carrelage", label: "Reparation carrelage" }
  ]
};

const DEFAULT_REPAIR_OPTIONS = [
  { value: "Nettoyage technique", label: "Nettoyage technique" },
  { value: "Controle general", label: "Controle general" },
  { value: "Petite reparation", label: "Petite reparation" }
];

const ticketSchema = z.object({
  managedPropertyId: z.string().trim().min(1, "Le bien est requis"),
  titleSelections: z.array(z.object({
    value: z.string(),
    label: z.string()
  })).min(1, "Selectionnez au moins une reparation"),
  description: z.string().trim().max(5000).default(""),
  priority: z.enum(["high", "medium", "low"]),
  assignee: z.string().trim().max(255).default(""),
  status: z.enum(["planned", "in_progress", "closed"]),
  maintenanceAmount: z.coerce.number().min(0, "Le prix total doit etre positif").default(0),
  currency: z.string().trim().min(2).max(8),
  lastUpdateAt: z.string().trim().min(1, "La date de mise a jour est requise")
});

const priorityOptions = [
  { value: "high", label: "Haute" },
  { value: "medium", label: "Moyenne" },
  { value: "low", label: "Basse" }
];

const statusOptions = [
  { value: "planned", label: "Planifie" },
  { value: "in_progress", label: "En cours" },
  { value: "closed", label: "Cloture" }
];

export const ModalManageTicket = ({
  open,
  mode = "create",
  ticket = null,
  propertyOptions = [],
  onClose,
  onSubmit,
  isSaving = false
}) => {
  const { preferences } = useUserPreferences();
  const preferredCurrency = String(preferences.currency || "USD").toUpperCase();

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
    reset({
      managedPropertyId: ticket?.managedPropertyId || "",
      titleSelections: (ticket?.titleSelections || []).map((item) => ({ value: item, label: item })),
      description: ticket?.description || "",
      priority: ticket?.priorityValue || "medium",
      assignee: ticket?.assignee === "-" ? "" : ticket?.assignee || "",
      status: ticket?.statusValue || "planned",
      maintenanceAmount: Number(ticket?.maintenanceAmount ?? 0),
      currency: preferredCurrency,
      lastUpdateAt: ticket?.lastUpdateAt ? new Date(ticket.lastUpdateAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
  }, [preferredCurrency, ticket, reset]);

  const managedPropertyId = watch("managedPropertyId");

  const selectedProperty = useMemo(
    () => propertyOptions.find((option) => option.value === managedPropertyId) || null,
    [managedPropertyId, propertyOptions]
  );
  const repairOptions = useMemo(
    () => REPAIR_OPTIONS_BY_PROPERTY_TYPE[selectedProperty?.type] || DEFAULT_REPAIR_OPTIONS,
    [selectedProperty?.type]
  );

  const title = mode === "edit" ? "Modifier le ticket" : "Nouveau ticket";

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
      saveLabel={mode === "edit" ? "Enregistrer" : "Creer"}
      isSaving={isSaving}
      saveDisabled={!propertyOptions.length}
    >
      <div className="space-y-5">
        <Controller
          name="managedPropertyId"
          control={control}
          render={({ field }) => (
            <BaseListBox
              label="Bien concerne"
              options={propertyOptions}
              value={propertyOptions.find((option) => option.value === field.value) || null}
              onChange={(option) => field.onChange(option?.value || "")}
              placeholder={propertyOptions.length ? "Selectionner un bien" : "Aucun bien disponible"}
              error={errors.managedPropertyId?.message}
              disabled={!propertyOptions.length}
            />
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="titleSelections"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label="Titre du ticket"
                options={repairOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Selectionner une ou plusieurs reparations"
                error={errors.titleSelections?.message}
                multiple
                disabled={!selectedProperty}
              />
            )}
          />
          <Controller
            name="assignee"
            control={control}
            render={({ field }) => (
              <Input
                label="Intervenant"
                placeholder="Entreprise ou technicien"
                error={errors.assignee?.message}
                {...field}
              />
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label="Priorite"
                options={priorityOptions}
                value={priorityOptions.find((option) => option.value === field.value) || null}
                onChange={(option) => field.onChange(option?.value || "medium")}
                error={errors.priority?.message}
              />
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label="Statut"
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
                label="Derniere mise a jour"
                type="date"
                error={errors.lastUpdateAt?.message}
                {...field}
              />
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
          <Controller
            name="maintenanceAmount"
            control={control}
            render={({ field }) => (
              <Input
                label="Prix total de l'entretien"
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
                label="Devise"
                readOnly
                className="cursor-default bg-stone-950/90 text-stone-200"
                error={errors.currency?.message}
                {...field}
              />
            )}
          />
        </div>

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              label="Details"
              placeholder="Precisez le contexte, l'urgence et ce qui doit etre traite."
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
