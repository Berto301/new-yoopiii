import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { cn } from "../../../lib/utils/cn.js";

export const DashboardHero = ({ eyebrow, title, description, metrics = [] }) => (
  <Card className="overflow-hidden border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(157,93,67,0.14),transparent_28%),var(--surface)] p-0">
    <div className="relative overflow-hidden p-6 lg:p-8">
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(249,115,22,0.08),transparent)]" />
      <div className="relative space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand-contrast)]">{eyebrow}</p>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-[var(--foreground)] lg:text-4xl">{title}</h2>
            <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">{description}</p>
          </div>
        </div>

        {metrics.length ? (
          <div className="flex flex-wrap gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-sm text-[var(--foreground)] backdrop-blur">
                <span className="text-[var(--muted)]">{metric.label}</span>
                <span className="ml-2 font-semibold text-[var(--foreground)]">{metric.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  </Card>
);

export const DashboardStatsGrid = ({ items = [] }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <Card key={item.label} className="border-[var(--border)] bg-[var(--surface)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{item.label}</p>
          <p className="text-3xl font-semibold text-[var(--foreground)]">{item.value}</p>
          <p className="text-sm leading-6 text-[var(--muted)]">{item.helpText}</p>
        </div>
      </Card>
    ))}
  </div>
);

export const DashboardPanel = ({ title, description, badge, action, children, className }) => (
  <Card className={cn("border-[var(--border)] bg-[var(--surface)]", className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-[var(--foreground)]">{title}</h3>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        {description ? <p className="text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    <div className="mt-5">{children}</div>
  </Card>
);

export const DashboardEmptyState = ({ title, description, actionLabel, onAction }) => (
  <div className="rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-5 py-8 text-center">
    <p className="text-base font-medium text-[var(--foreground)]">{title}</p>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
    {actionLabel ? (
      <Button type="button" variant="secondary" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

export const DashboardLoadingState = ({ label = "Chargement..." }) => (
  <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-8 text-sm text-[var(--muted)]">{label}</div>
);
