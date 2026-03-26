import { cn } from "../../lib/utils/cn.js";

export const Badge = ({ className, children }) => (
  <span
    className={cn(
      "inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-brand-100",
      className
    )}
  >
    {children}
  </span>
);
