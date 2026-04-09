import { cn } from "../../lib/utils/cn.js";

export const Switch = ({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  error
}) => (
  <label
    className={cn(
      "flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
      disabled && "cursor-not-allowed opacity-70",
      error && "border-red-400/60"
    )}
  >
    <span className="space-y-1">
      {label ? <span className="block text-sm font-medium text-stone-100">{label}</span> : null}
      {description ? <span className="block text-xs leading-5 text-stone-400">{description}</span> : null}
      {error ? <span className="block text-xs text-red-300">{error}</span> : null}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        if (!disabled) {
          onChange?.(!checked);
        }
      }}
      className={cn(
        "relative mt-0.5 inline-flex h-7 w-12 shrink-0 rounded-full border border-white/10 transition",
        checked ? "bg-brand-500" : "bg-stone-800",
        disabled && "pointer-events-none"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition",
          checked ? "left-[1.45rem]" : "left-0.5"
        )}
      />
    </button>
  </label>
);

export default Switch;
