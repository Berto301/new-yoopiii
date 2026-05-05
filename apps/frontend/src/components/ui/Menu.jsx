import { Fragment } from "react";
import { Menu as HeadlessMenu, Transition } from "@headlessui/react";
import { cn } from "../../lib/utils/cn.js";

const menuItemClassName = ({ active, disabled }) => cn(
  "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition",
  active ? "bg-[var(--surface-accent)] text-[var(--foreground)]" : "text-[var(--foreground)]",
  disabled && "cursor-not-allowed opacity-50"
);

const menuButtonClassName = "inline-flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--input-bg)] text-[var(--foreground)] transition hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60";

export const Menu = ({
  icon,
  items = [],
  disabled = false,
  align = "left",
  buttonClassName,
  itemsClassName,
  "aria-label": ariaLabel = "Ouvrir le menu"
}) => (
  <HeadlessMenu as="div" className="relative shrink-0">
    <HeadlessMenu.Button
      className={cn(menuButtonClassName, buttonClassName)}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {icon}
    </HeadlessMenu.Button>
    <Transition
      as={Fragment}
      enter="transition duration-100 ease-out"
      enterFrom="scale-95 opacity-0"
      enterTo="scale-100 opacity-100"
      leave="transition duration-75 ease-in"
      leaveFrom="scale-100 opacity-100"
      leaveTo="scale-95 opacity-0"
    >
      <HeadlessMenu.Items
        className={cn(
          "absolute bottom-full z-20 mb-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl focus:outline-none",
          align === "right" ? "right-0" : "left-0",
          itemsClassName
        )}
      >
        {items.map((item) => (
          <HeadlessMenu.Item key={item.label} disabled={disabled || item.disabled}>
            {({ active, disabled: itemDisabled, close }) => (
              <button
                type="button"
                className={menuItemClassName({ active, disabled: itemDisabled })}
                disabled={itemDisabled}
                onClick={() => {
                  item.action?.();
                  close();
                }}
              >
                {item.label}
              </button>
            )}
          </HeadlessMenu.Item>
        ))}
      </HeadlessMenu.Items>
    </Transition>
  </HeadlessMenu>
);
