import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { cn } from "../../lib/utils/cn.js";

const resolveLabel = (option, optionLabelKey) => {
  if (typeof option === "string") {
    return option;
  }

  return option?.[optionLabelKey] || "";
};

export const BaseListBox = ({
  label,
  value,
  onChange,
  options = [],
  optionLabelKey = "label",
  optionValueKey = "value",
  placeholder = "Selectionner",
  multiple = false,
  error,
  disabled = false
}) => {
  const displayValue = multiple
    ? (Array.isArray(value) ? value : []).map((item) => resolveLabel(item, optionLabelKey)).join(", ") || placeholder
    : value
      ? resolveLabel(value, optionLabelKey)
      : placeholder;

  return (
    <div className="space-y-2" data-ui="listbox-root">
      {label ? <span className="text-sm font-medium text-[var(--foreground)]">{label}</span> : null}
      <Listbox value={value} onChange={onChange} multiple={multiple} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            data-ui="listbox-button"
            className={cn(
              "w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-left text-sm text-[var(--foreground)] transition focus:border-brand-500 focus:outline-none",
              error && "border-red-400/60",
              disabled && "cursor-not-allowed opacity-70"
            )}
          >
            <span className={cn(!value || (Array.isArray(value) && !value.length) ? "text-[var(--muted)]" : "text-[var(--foreground)]")}>{displayValue}</span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options data-ui="listbox-options" className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl focus:outline-none">
              {options.map((option) => (
                <Listbox.Option
                  key={typeof option === "string" ? option : option[optionValueKey]}
                  value={option}
                  className={({ active, selected }) =>
                    cn(
                      "cursor-pointer rounded-xl px-4 py-3 text-sm text-[var(--foreground)]",
                      active && "bg-[var(--surface-accent)] text-[var(--foreground)]",
                      selected && "bg-[var(--surface-muted)] text-[var(--foreground)]"
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between gap-3">
                      <span>{resolveLabel(option, optionLabelKey)}</span>
                      {selected ? <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-brand-500)]">OK</span> : null}
                    </div>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
};
