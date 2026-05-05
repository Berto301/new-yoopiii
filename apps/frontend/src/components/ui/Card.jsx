import { cn } from "../../lib/utils/cn.js";

export const Card = ({ className, ...props }) => (
  <div
    data-ui="card-root"
    className={cn(
      "w-full min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--foreground)] shadow-[0_20px_80px_rgba(0,0,0,0.16)]",
      className
    )}
    {...props}
  />
);
