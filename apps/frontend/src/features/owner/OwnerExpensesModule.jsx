import { useMemo, useState } from "react";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";
import { ModalDelete } from "../../components/layout/modals/ModalDelete.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useNotification } from "../../hooks/useNotification.js";
import { notifyApiErrors } from "../../lib/errors/api-error.js";
import {
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPanel,
  DashboardStatsGrid
} from "../dashboards/components/DashboardBlocks.jsx";
import { useOwnerExpensesWorkspace } from "./hooks/useOwnerExpensesWorkspace.js";
import { ModalManageExpense } from "../../pages/private/owner/ModalManageExpense.jsx";

const replaceTemplate = (template, values = {}) =>
  Object.entries(values).reduce(
    (currentValue, [key, value]) => currentValue.replaceAll(`{${key}}`, String(value)),
    template
  );

const formatCurrency = ({ value, currency, preferences }) => formatMoney(value, currency, preferences);

const formatDate = ({ value, locale }) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
};

const getTypeClassName = (type) =>
  type === "actif"
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : "border-rose-400/30 bg-rose-500/10 text-rose-100";

const getBalanceTone = (value) => {
  if (value > 0) {
    return "text-emerald-100";
  }

  if (value < 0) {
    return "text-rose-100";
  }

  return "text-white";
};

const monthValues = ["all", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export const OwnerExpensesModule = () => {
  const { t, locale, preferences } = useUserPreferences();
  const { showSuccess, showError } = useNotification();
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    year: String(currentYear),
    month: "all",
    propertyId: "all",
    type: "all"
  });
  const [modalState, setModalState] = useState({ open: false, mode: "create", expense: null });
  const [deleteModalState, setDeleteModalState] = useState({ open: false, expense: null });

  const queryFilters = useMemo(() => ({
    year: filters.year,
    month: filters.month,
    propertyId: filters.propertyId,
    type: filters.type
  }), [filters]);

  const {
    expensesQuery,
    managedPropertiesQuery,
    createExpenseMutation,
    updateExpenseMutation,
    deleteExpenseMutation
  } = useOwnerExpensesWorkspace(queryFilters);

  const categoryLabels = useMemo(() => ({
    rent_income: t("private", "owner.expenses.categories.rent_income", "Revenus locatifs"),
    sale_price: t("private", "owner.expenses.categories.sale_price", "Prix de vente"),
    property_income: t("private", "owner.expenses.categories.property_income", "Autres revenus"),
    maintenance: t("private", "owner.expenses.categories.maintenance", "Entretien"),
    administrative: t("private", "owner.expenses.categories.administrative", "Administratif"),
    commission: t("private", "owner.expenses.categories.commission", "Commission"),
    other_charge: t("private", "owner.expenses.categories.other_charge", "Autres charges")
  }), [t]);

  const monthLabels = useMemo(() => ({
    all: t("private", "owner.expenses.filters.allMonths", "Tous les mois"),
    1: t("private", "owner.expenses.months.january", "Janvier"),
    2: t("private", "owner.expenses.months.february", "Fevrier"),
    3: t("private", "owner.expenses.months.march", "Mars"),
    4: t("private", "owner.expenses.months.april", "Avril"),
    5: t("private", "owner.expenses.months.may", "Mai"),
    6: t("private", "owner.expenses.months.june", "Juin"),
    7: t("private", "owner.expenses.months.july", "Juillet"),
    8: t("private", "owner.expenses.months.august", "Aout"),
    9: t("private", "owner.expenses.months.september", "Septembre"),
    10: t("private", "owner.expenses.months.october", "Octobre"),
    11: t("private", "owner.expenses.months.november", "Novembre"),
    12: t("private", "owner.expenses.months.december", "Decembre")
  }), [t]);

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index)),
    [currentYear]
  );

  const propertyOptions = useMemo(
    () =>
      (managedPropertiesQuery.data || []).map((property) => ({
        value: property.id,
        label: property.title,
        type: property.type
      })),
    [managedPropertiesQuery.data]
  );

  const expenseData = expensesQuery.data || {};
  const expenses = expenseData.items || [];
  const summary = expenseData.summary || {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    incomeCount: 0,
    expenseCount: 0,
    budgetExceededCount: 0,
    count: 0,
    categoryBreakdown: []
  };
  const currency = preferences.currency || expenses[0]?.currency || "USD";
  const maxCategoryTotal = Math.max(...(summary.categoryBreakdown || []).map((item) => item.total), 1);
  const syncedMaintenanceCount = expenses.filter((expense) => expense.source === "maintenance").length;
  const manualMovementCount = expenses.filter((expense) => expense.source !== "maintenance").length;

  const stats = [
    {
      label: t("private", "owner.expenses.summary.income", "Revenus"),
      value: formatCurrency({ value: summary.totalIncome, currency, preferences }),
      helpText: t("private", "owner.expenses.summary.incomeHelp", "Actifs enregistres sur la periode filtree.")
    },
    {
      label: t("private", "owner.expenses.summary.expenses", "Depenses"),
      value: formatCurrency({ value: summary.totalExpenses, currency, preferences }),
      helpText: t("private", "owner.expenses.summary.expensesHelp", "Passifs, charges et maintenance synchronisee.")
    },
    {
      label: t("private", "owner.expenses.summary.balance", "Balance nette"),
      value: formatCurrency({ value: summary.netBalance, currency, preferences }),
      helpText: t("private", "owner.expenses.summary.balanceHelp", "Revenus moins depenses sur les filtres actifs."),
      valueClassName: getBalanceTone(summary.netBalance)
    },
    {
      label: t("private", "owner.expenses.summary.budgetAlerts", "Budgets depasses"),
      value: String(summary.budgetExceededCount || 0),
      helpText: t("private", "owner.expenses.summary.budgetHelp", "Lignes au-dessus du budget prevu.")
    }
  ];

  const handleFilterChange = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value
    }));
  };

  const handleSubmitExpense = async (payload) => {
    try {
      if (modalState.mode === "edit" && modalState.expense) {
        await updateExpenseMutation.mutateAsync({
          expenseId: modalState.expense.id,
          payload
        });
        showSuccess(t("private", "owner.expenses.messages.updateSuccess", "Mouvement financier mis a jour."));
      } else {
        await createExpenseMutation.mutateAsync(payload);
        showSuccess(t("private", "owner.expenses.messages.createSuccess", "Mouvement financier ajoute."));
      }

      setModalState({ open: false, mode: "create", expense: null });
    } catch (error) {
      notifyApiErrors({
        error,
        showError,
        fallbackMessage: t("private", "owner.expenses.messages.saveError", "La gestion du mouvement financier a echoue.")
      });
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteModalState.expense) {
      return;
    }

    try {
      await deleteExpenseMutation.mutateAsync(deleteModalState.expense.id);
      showSuccess(t("private", "owner.expenses.messages.deleteSuccess", "Mouvement financier supprime."));
      setDeleteModalState({ open: false, expense: null });
    } catch (error) {
      notifyApiErrors({
        error,
        showError,
        fallbackMessage: t("private", "owner.expenses.messages.deleteError", "La suppression du mouvement financier a echoue.")
      });
    }
  };

  if (expensesQuery.isLoading) {
    return <DashboardLoadingState label={t("private", "owner.expenses.loading", "Chargement des depenses...")} />;
  }

  if (expensesQuery.isError) {
    return (
      <DashboardEmptyState
        title={t("private", "owner.expenses.unavailableTitle", "Gestion des depenses indisponible")}
        description={t("private", "owner.expenses.unavailableDescription", "Les mouvements financiers n'ont pas pu etre charges.")}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        <DashboardStatsGrid items={stats.map((item) => ({
          ...item,
          value: <span className={item.valueClassName || "text-white"}>{item.value}</span>
        }))} />

        <DashboardPanel
          title={t("private", "owner.expenses.title", "Gestion des depenses")}
          description={t("private", "owner.expenses.description", "Suivez les actifs, les passifs, les budgets et les mouvements synchronises avec vos biens.")}
          badge={replaceTemplate(t("private", "owner.expenses.badge", "{count} mouvements"), { count: summary.count || 0 })}
          action={
            <Button type="button" variant="secondary" onClick={() => setModalState({ open: true, mode: "create", expense: null })}>
              {t("private", "owner.expenses.actions.new", "Nouveau mouvement")}
            </Button>
          }
        >
          <div className="mb-5 grid gap-4 rounded-[1.75rem] border border-white/10 bg-stone-950/40 p-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-200">{t("private", "owner.expenses.filters.year", "Annee")}</span>
              <select
                value={filters.year}
                onChange={(event) => handleFilterChange("year", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-200">{t("private", "owner.expenses.filters.month", "Mois")}</span>
              <select
                value={filters.month}
                onChange={(event) => handleFilterChange("month", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
              >
                {monthValues.map((month) => (
                  <option key={month} value={month}>{monthLabels[month]}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-200">{t("private", "owner.expenses.filters.property", "Bien")}</span>
              <select
                value={filters.propertyId}
                onChange={(event) => handleFilterChange("propertyId", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
              >
                <option value="all">{t("private", "owner.expenses.filters.allProperties", "Tous les biens")}</option>
                {propertyOptions.map((property) => (
                  <option key={property.value} value={property.value}>{property.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-200">{t("private", "owner.expenses.filters.type", "Type")}</span>
              <select
                value={filters.type}
                onChange={(event) => handleFilterChange("type", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
              >
                <option value="all">{t("private", "owner.expenses.filters.allTypes", "Tous")}</option>
                <option value="actif">{t("private", "owner.expenses.types.actif", "Actif")}</option>
                <option value="passif">{t("private", "owner.expenses.types.passif", "Passif")}</option>
              </select>
            </label>
          </div>

          {expenses.length ? (
            <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5">
                    <tr>
                      {[
                        t("private", "owner.expenses.columns.movement", "Mouvement"),
                        t("private", "owner.expenses.columns.property", "Bien"),
                        t("private", "owner.expenses.columns.category", "Categorie"),
                        t("private", "owner.expenses.columns.amount", "Montant"),
                        t("private", "owner.expenses.columns.date", "Date"),
                        t("private", "owner.expenses.columns.actions", "Actions")
                      ].map((column) => (
                        <th key={column} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-stone-950/40">
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-white">{expense.label}</p>
                              {expense.source === "maintenance" ? (
                                <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">
                                  {t("private", "owner.expenses.sources.maintenance", "Maintenance")}
                                </Badge>
                              ) : null}
                              {expense.isBudgetExceeded ? (
                                <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-100">
                                  {t("private", "owner.expenses.labels.budgetExceeded", "Budget depasse")}
                                </Badge>
                              ) : null}
                            </div>
                            {expense.description ? <p className="max-w-md text-sm leading-6 text-stone-400">{expense.description}</p> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-stone-200">{expense.propertyLabel}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-2">
                            <Badge className={getTypeClassName(expense.type)}>
                              {expense.type === "actif"
                                ? t("private", "owner.expenses.types.actif", "Actif")
                                : t("private", "owner.expenses.types.passif", "Passif")}
                            </Badge>
                            <p className="text-sm text-stone-300">{categoryLabels[expense.category] || expense.category}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className={expense.type === "actif" ? "text-sm font-semibold text-emerald-100" : "text-sm font-semibold text-rose-100"}>
                            {formatCurrency({ value: expense.amount, currency: expense.currency, preferences })}
                          </p>
                          {expense.budgetAmount ? (
                            <p className="mt-1 text-xs text-stone-500">
                              {replaceTemplate(t("private", "owner.expenses.labels.budgetAmount", "Budget {amount}"), {
                                amount: formatCurrency({ value: expense.budgetAmount, currency: expense.currency, preferences })
                              })}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-stone-300">
                          {formatDate({ value: expense.expenseDate, locale })}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-3 py-2 text-xs"
                              onClick={() => setModalState({ open: true, mode: "edit", expense })}
                            >
                              {t("private", "owner.expenses.actions.edit", "Modifier")}
                            </Button>
                            {expense.source !== "maintenance" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="px-3 py-2 text-xs text-red-200"
                                onClick={() => setDeleteModalState({ open: true, expense })}
                              >
                                {t("private", "owner.expenses.actions.delete", "Supprimer")}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <DashboardEmptyState
              title={t("private", "owner.expenses.emptyTitle", "Aucun mouvement financier")}
              description={t("private", "owner.expenses.emptyDescription", "Ajoutez un revenu, une charge ou ajustez les filtres pour visualiser le suivi financier.")}
              actionLabel={t("private", "owner.expenses.actions.new", "Nouveau mouvement")}
              onAction={() => setModalState({ open: true, mode: "create", expense: null })}
            />
          )}
        </DashboardPanel>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardPanel
            title={t("private", "owner.expenses.chart.title", "Repartition par categorie")}
            description={t("private", "owner.expenses.chart.description", "Lecture rapide des revenus et charges les plus importants sur la periode.")}
          >
            {(summary.categoryBreakdown || []).length ? (
              <div className="space-y-4">
                {summary.categoryBreakdown.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-stone-200">{categoryLabels[item.category] || item.category}</span>
                      <span className={item.type === "actif" ? "font-semibold text-emerald-100" : "font-semibold text-rose-100"}>
                        {formatCurrency({ value: item.total, currency, preferences })}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-stone-950/70">
                      <div
                        className={item.type === "actif" ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-rose-500"}
                        style={{ width: `${Math.max(8, Math.round((item.total / maxCategoryTotal) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">{t("private", "owner.expenses.chart.empty", "Aucune categorie a afficher pour ces filtres.")}</p>
            )}
          </DashboardPanel>

          <Card className="border-white/10 bg-white/[0.04]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">
              {t("private", "owner.expenses.sync.eyebrow", "Synchronisation")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {t("private", "owner.expenses.sync.title", "Sources actives")}
            </h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: t("private", "owner.expenses.sync.manual", "Manuels"), value: manualMovementCount },
                { label: t("private", "owner.expenses.sync.maintenance", "Maintenance"), value: syncedMaintenanceCount },
                { label: t("private", "owner.expenses.sync.alerts", "Alertes budget"), value: summary.budgetExceededCount || 0 }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-stone-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ModalManageExpense
        open={modalState.open}
        mode={modalState.mode}
        expense={modalState.expense}
        propertyOptions={propertyOptions}
        onClose={() => setModalState({ open: false, mode: "create", expense: null })}
        onSubmit={handleSubmitExpense}
        isSaving={createExpenseMutation.isPending || updateExpenseMutation.isPending}
      />

      <ModalDelete
        open={deleteModalState.open}
        title={t("private", "owner.expenses.deleteTitle", "Supprimer le mouvement")}
        content={replaceTemplate(t("private", "owner.expenses.deleteContent", "Voulez-vous vraiment supprimer {label} ?"), {
          label: deleteModalState.expense?.label || t("private", "owner.expenses.deleteFallback", "ce mouvement")
        })}
        onClose={() => setDeleteModalState({ open: false, expense: null })}
        onConfirm={handleDeleteExpense}
        isDeleting={deleteExpenseMutation.isPending}
      />
    </>
  );
};
