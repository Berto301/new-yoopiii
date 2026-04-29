export const PROPERTY_THREE_D_STATUS_META = {
  pending: {
    label: "Lien manquant",
    className: "border-amber-400/30 bg-amber-500/10 text-amber-100"
  },
  processing: {
    label: "En cours",
    className: "border-sky-400/30 bg-sky-500/10 text-sky-100"
  },
  generated: {
    label: "Disponible",
    className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  },
  error: {
    label: "Erreur",
    className: "border-red-400/30 bg-red-500/10 text-red-100"
  },
  disabled: {
    label: "Desactivee",
    className: "border-white/10 bg-white/5 text-stone-300"
  }
};

export const hasPropertyThreeDLink = (property) => Boolean(String(property?.threeDUrl || "").trim());

export const getPropertyThreeDStatusMeta = ({ is3DEnabled, status }) => {
  if (!is3DEnabled) {
    return PROPERTY_THREE_D_STATUS_META.disabled;
  }

  return PROPERTY_THREE_D_STATUS_META[status] || PROPERTY_THREE_D_STATUS_META.pending;
};
