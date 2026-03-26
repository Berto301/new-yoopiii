import { cn } from "../../lib/utils/cn.js";

const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-700",
  secondary: "border border-white/15 bg-white/5 text-white hover:border-white/30",
  ghost: "bg-transparent text-stone-200 hover:bg-white/5"
};

export const Button = ({ className, variant = "primary", ...props }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60",
      variants[variant],
      className
    )}
    {...props}
  />
);
