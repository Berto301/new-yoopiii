import { cn } from "../../lib/utils/cn.js";

const variants = {
  primary: "bg-[var(--color-brand-500)] text-[var(--on-brand)] hover:bg-[var(--color-brand-700)]",
  secondary: "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]",
  ghost: "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
};

export const Button = ({ className, variant = "primary", as: Component = "button", onClick, ...props }) => {
  const handleClick = onClick
    ? (event) => {
        Promise.resolve().then(() => onClick(event)).catch(() => {});
      }
    : undefined;

  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      onClick={handleClick}
      {...props}
    />
  );
};
