import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { Textarea } from "../../../components/ui/Textarea.jsx";

const CATEGORY_TYPE_MAP = {
  rent_income: "actif",
  sale_price: "actif",
  property_income: "actif",
  maintenance: "passif",
  administrative: "passif",
  commission: "passif",
  other_charge: "passif"
};

const toDateInputValue = (value) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(value).toISOString().slice(0, 10);
};

export const ModalManageExpense = ({
  open,
  mode = "create",
  expense = null,
  propertyOptions = [],
  onClose,
  onSubmit,
  isSaving = false
}) => {
  const { preferences, t } = useUserPreferences();
  const preferredCurrency = String(preferences.currency || "USD").toUpperCase();
  const isSyncedMaintenance = expense?.source === "maintenance";

  const schema = useMemo(() => z.object({
    propertyId: z.string().trim().default(""),
    label: z.string().trim().min(2, t("private", "owner.expenses.validation.label", "Le libelle est requis")),
    description: z.string().trim().max(5000).default(""),
    category: z.enum([
      "rent_income",
      "sale_price",
      "property_income",
      "maintenance",
      "administrative",
      "commission",
      "other_charge"
    ]),
    amount: z.coerce.number().min(0, t("private", "owner.expenses.validation.amount", "Le montant doit etre positif")),
    currency: z.string().trim().min(2).max(8),
    expenseDate: z.string().trim().min(1, t("private", "owner.expenses.validation.date", "La date est requise")),
    budgetAmount: z.coerce.number().min(0).default(0)
  }), [t]);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: "",
      label: "",
      description: "",
      category: "maintenance",
      amount: 0,
      currency: preferredCurrency,
      expenseDate: new Date().toISOString().slice(0, 10),
      budgetAmount: 0
    }
  });

  useEffect(() => {
    reset({
      propertyId: expense?.propertyId || "",
      label: expense?.label || "",
      description: expense?.description || "",
      category: expense?.category || "maintenance",
      amount: expense?.amount ?? 0,
      currency: preferredCurrency,
      expenseDate: toDateInputValue(expense?.expenseDate),
      budgetAmount: expense?.budgetAmount ?? 0
    });
  }, [expense, preferredCurrency, reset]);

  const portfolioOption = useMemo(
    () => ({ value: "", label: t("private", "owner.expenses.filters.portfolio", "Portefeuille") }),
    [t]
  );

  const categoryOptions = useMemo(() => [
    { value: "rent_income", label: t("private", "owner.expenses.categories.rent_income", "Revenus locatifs") },
    { value: "sale_price", label: t("private", "owner.expenses.categories.sale_price", "Prix de vente") },
    { value: "property_income", label: t("private", "owner.expenses.categories.property_income", "Autres revenus") },
    { value: "maintenance", label: t("private", "owner.expenses.categories.maintenance", "Entretien") },
    { value: "administrative", label: t("private", "owner.expenses.categories.administrative", "Administratif") },
    { value: "commission", label: t("private", "owner.expenses.categories.commission", "Commission") },
    { value: "other_charge", label: t("private", "owner.expenses.categories.other_charge", "Autres charges") }
  ], [t]);

  const propertySelectOptions = useMemo(
    () => [portfolioOption, ...propertyOptions],
    [portfolioOption, propertyOptions]
  );

  const selectedPropertyId = watch("propertyId");
  const selectedCategory = watch("category");
  const selectedType = CATEGORY_TYPE_MAP[selectedCategory] || "passif";
  const selectedProperty = propertyOptions.find((option) => option.value === selectedPropertyId) || null;

  return (
    <ModalLayout
      open={open}
      title={mode === "edit"
        ? t("private", "owner.expenses.modal.editTitle", "Modifier le mouvement")
        : t("private", "owner.expenses.modal.createTitle", "Nouveau mouvement")}
      onClose={onClose}
      onSave={handleSubmit((values) => onSubmit({
        ...values,
        propertyId: values.propertyId || undefined,
        propertyLabel: selectedProperty?.label || "",
        type: selectedType
      }))}
      saveLabel={mode === "edit"
        ? t("private", "owner.expenses.actions.save", "Enregistrer")
        : t("private", "owner.expenses.actions.create", "Creer")}
      isSaving={isSaving}
    >
      <div className="space-y-5">
        {isSyncedMaintenance ? (
          <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            {t("private", "owner.expenses.modal.syncedMaintenance", "Ligne synchronisee avec la maintenance. Le montant vient du ticket et la devise suit vos parametres.")}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <Controller
            name="label"
            control={control}
            render={({ field }) => (
              <Input
                label={t("private", "owner.expenses.fields.label", "Libelle")}
                placeholder={t("private", "owner.expenses.placeholders.label", "Ex: Loyer avril, peinture facade...")}
                error={errors.label?.message}
                disabled={isSyncedMaintenance}
                {...field}
              />
            )}
          />
          <div className="space-y-2">
            <span className="text-sm font-medium text-stone-200">{t("private", "owner.expenses.fields.type", "Type")}</span>
            <div className="flex min-h-[46px] items-center">
              <Badge className={selectedType === "actif"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                : "border-rose-400/30 bg-rose-500/10 text-rose-100"}
              >
                {selectedType === "actif"
                  ? t("private", "owner.expenses.types.actif", "Actif")
                  : t("private", "owner.expenses.types.passif", "Passif")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="propertyId"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label={t("private", "owner.expenses.fields.property", "Bien")}
                options={propertySelectOptions}
                value={propertySelectOptions.find((option) => option.value === field.value) || portfolioOption}
                onChange={(option) => field.onChange(option?.value || "")}
                placeholder={t("private", "owner.expenses.placeholders.property", "Selectionner un bien")}
                error={errors.propertyId?.message}
                disabled={isSyncedMaintenance}
              />
            )}
          />
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label={t("private", "owner.expenses.fields.category", "Categorie")}
                options={categoryOptions}
                value={categoryOptions.find((option) => option.value === field.value) || null}
                onChange={(option) => field.onChange(option?.value || "maintenance")}
                error={errors.category?.message}
                disabled={isSyncedMaintenance}
              />
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Input
                label={t("private", "owner.expenses.fields.amount", "Montant")}
                type="number"
                min="0"
                step="1"
                error={errors.amount?.message}
                disabled={isSyncedMaintenance}
                className={isSyncedMaintenance ? "cursor-not-allowed bg-stone-950/90 text-stone-500" : undefined}
                {...field}
              />
            )}
          />
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Input
                label={t("private", "owner.expenses.fields.currency", "Devise")}
                error={errors.currency?.message}
                readOnly
                className="cursor-default bg-stone-950/90 text-stone-200"
                {...field}
              />
            )}
          />
          <Controller
            name="budgetAmount"
            control={control}
            render={({ field }) => (
              <Input
                label={t("private", "owner.expenses.fields.budget", "Budget")}
                type="number"
                min="0"
                step="1"
                error={errors.budgetAmount?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="expenseDate"
            control={control}
            render={({ field }) => (
              <Input
                label={t("private", "owner.expenses.fields.date", "Date")}
                type="date"
                error={errors.expenseDate?.message}
                disabled={isSyncedMaintenance}
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
              label={t("private", "owner.expenses.fields.description", "Description")}
              placeholder={t("private", "owner.expenses.placeholders.description", "Notes internes, facture, contexte ou reference.")}
              rows={4}
              error={errors.description?.message}
              disabled={isSyncedMaintenance}
              {...field}
            />
          )}
        />
      </div>
    </ModalLayout>
  );
};
