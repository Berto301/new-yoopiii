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
    <div className="space-y-2">
      {label ? <span className="text-sm font-medium text-stone-200">{label}</span> : null}
      <Listbox value={value} onChange={onChange} multiple={multiple} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={cn(
              "w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-left text-sm text-white transition focus:border-brand-500 focus:outline-none",
              error && "border-red-400/60",
              disabled && "cursor-not-allowed opacity-70"
            )}
          >
            <span className={cn(!value || (Array.isArray(value) && !value.length) ? "text-stone-500" : "text-white")}>{displayValue}</span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-white/10 bg-stone-950/95 p-2 shadow-xl focus:outline-none">
              {options.map((option) => (
                <Listbox.Option
                  key={typeof option === "string" ? option : option[optionValueKey]}
                  value={option}
                  className={({ active, selected }) =>
                    cn(
                      "cursor-pointer rounded-xl px-4 py-3 text-sm text-stone-200",
                      active && "bg-brand-500/15 text-white",
                      selected && "bg-white/10 text-white"
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between gap-3">
                      <span>{resolveLabel(option, optionLabelKey)}</span>
                      {selected ? <span className="text-xs uppercase tracking-[0.2em] text-brand-100">OK</span> : null}
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
