import { cn } from "../../lib/utils/cn.js";

export const Textarea = ({ label, error, className, rows = 4, ...props }) => (
  <label className="block space-y-2">
    {label ? <span className="text-sm font-medium text-stone-200">{label}</span> : null}
    <textarea
      rows={rows}
      className={cn(
        "min-h-28 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500",
        error && "border-red-400/60",
        className
      )}
      {...props}
    />
    {error ? <span className="text-xs text-red-300">{error}</span> : null}
  </label>
);

export default Textarea;
