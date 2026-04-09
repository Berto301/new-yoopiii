import { cn } from "../../lib/utils/cn.js";

export const RadioGroup = ({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  error
}) => (
  <div className="space-y-2">
    {label ? <span className="text-sm font-medium text-stone-200">{label}</span> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(option.value)}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left transition",
              isSelected ? "border-brand-500/70 bg-brand-500/10 text-white" : "border-white/10 bg-stone-900/60 text-stone-300",
              disabled && "cursor-not-allowed opacity-70",
              error && "border-red-400/60"
            )}
          >
            <span className="block text-sm font-medium">{option.label}</span>
            {option.description ? <span className="mt-1 block text-xs leading-5 text-stone-400">{option.description}</span> : null}
          </button>
        );
      })}
    </div>
    {error ? <span className="text-xs text-red-300">{error}</span> : null}
  </div>
);

export default RadioGroup;
