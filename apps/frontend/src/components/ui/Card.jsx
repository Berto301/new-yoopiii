import { cn } from "../../lib/utils/cn.js";

export const Card = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.2)]",
      className
    )}
    {...props}
  />
);
