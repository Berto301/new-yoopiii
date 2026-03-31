export const SettingsTabButton = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={active
      ? "rounded-2xl bg-brand-500 px-4 py-3 text-sm font-medium text-white"
      : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-300 hover:border-white/20 hover:text-white"
    }
  >
    {label}
  </button>
);
