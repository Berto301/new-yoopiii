import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Menu } from "../../components/ui/Menu.jsx";

const statusClassName = {
  approved: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]",
  paid: "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]",
  pending_approval: "border-amber-500/25 bg-[var(--warning-surface)] text-[var(--warning-foreground)]",
  pending: "border-amber-500/25 bg-[var(--warning-surface)] text-[var(--warning-foreground)]",
  late: "border-red-500/25 bg-[var(--danger-surface)] text-[var(--danger-foreground)]",
  rejected: "border-red-500/25 bg-[var(--danger-surface)] text-[var(--danger-foreground)]",
  cancelled: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
};

const PaymentStatus = ({ payment }) => (
  <Badge className={statusClassName[payment.status] || statusClassName.pending}>
    {payment.statusLabel || payment.status}
  </Badge>
);

export const RentPaymentsTable = ({
  payments = [],
  emptyLabel,
  isBusy = false,
  showApprove = false,
  onEdit,
  onDelete,
  onGenerateReceipt,
  onDownloadReceipt,
  onApprove
}) => {
  const { t } = useUserPreferences();

  if (!payments.length) {
    return (
      <Card className="border-dashed border-[var(--border)] bg-[var(--surface)] text-center">
        <p className="text-sm text-[var(--muted)]">{emptyLabel || t("private", "payments.empty", "Aucun paiement disponible.")}</p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[var(--surface-soft)]">
            <tr>
              {[
                t("private", "payments.columns.tenant", "Locataire"),
                t("private", "payments.columns.property", "Bien"),
                t("private", "payments.columns.dueDate", "Echeance"),
                t("private", "payments.columns.amount", "Montant"),
                t("private", "payments.columns.payment", "Paiement"),
                t("private", "payments.columns.status", "Statut"),
                t("private", "payments.columns.paymentDate", "Date de paiement"),
                t("private", "payments.columns.method", "Mode"),
                t("private", "payments.columns.actions", "Actions")
              ].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {payments.map((payment) => {
              const canEdit = payment.canEdit !== false;
              const canDelete = payment.canDelete !== false;
              const canGenerateReceipt = Boolean(payment.canGenerateReceipt);
              const canDownloadReceipt = Boolean(payment.canDownloadReceipt);
              const menuItems = [
                {
                  label: t("private", "payments.actions.edit", "Modifier"),
                  disabled: !onEdit || !canEdit || isBusy,
                  action: () => onEdit?.(payment)
                },
                {
                  label: t("private", "payments.actions.delete", "Supprimer"),
                  disabled: !onDelete || !canDelete || isBusy,
                  action: () => onDelete?.(payment)
                },
                ...(onGenerateReceipt
                  ? [{
                      label: t("private", "payments.actions.generateReceipt", "Generer quittance"),
                      disabled: !canGenerateReceipt || isBusy,
                      action: () => onGenerateReceipt?.(payment)
                    }]
                  : []),
                {
                  label: t("private", "payments.actions.receipt", "Telecharger quittance"),
                  disabled: !onDownloadReceipt || !canDownloadReceipt || isBusy,
                  action: () => onDownloadReceipt?.(payment)
                },
                ...(showApprove
                  ? [{
                      label: t("private", "payments.actions.approve", "Approuver le paiement"),
                      disabled: !onApprove || !payment.canApprove || isBusy,
                      action: () => onApprove?.(payment)
                    }]
                  : [])
              ];

              return (
                <tr key={payment.id} className="align-top">
                  <td className="px-4 py-4 text-sm font-medium text-[var(--foreground)]">{payment.tenant || "-"}</td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">{payment.property || "-"}</td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">{payment.dueDateLabel || "-"}</td>
                  <td className="px-4 py-4 text-sm font-medium text-[var(--foreground)]">{payment.amountLabel || "-"}</td>
                  <td className="px-4 py-4 text-sm font-medium text-[var(--foreground)]">{payment.paidAmountLabel || payment.payment || "-"}</td>
                  <td className="px-4 py-4 text-sm"><PaymentStatus payment={payment} /></td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">{payment.paymentDateLabel || "-"}</td>
                  <td className="px-4 py-4 text-sm text-[var(--muted)]">{payment.paymentMethodLabel || "-"}</td>
                  <td className="px-4 py-4">
                    <Menu
                      align="right"
                      aria-label={t("private", "payments.actions.open", "Ouvrir les actions")}
                      icon={<span className="text-lg leading-none">...</span>}
                      buttonClassName="h-10 w-10"
                      itemsClassName="bottom-auto top-full mt-2"
                      disabled={isBusy}
                      items={menuItems}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PaymentToolbar = ({ title, description, actionLabel, onAction, disabled = false }) => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h3 className="text-xl font-semibold text-[var(--foreground)]">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      <Button type="button" onClick={onAction} disabled={disabled}>
        {actionLabel}
      </Button>
    </div>
  </Card>
);
