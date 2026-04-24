export const PROPERTY_THREE_D_STATUS_META = {
  pending: {
    label: "En attente",
    className: "border-amber-400/30 bg-amber-500/10 text-amber-100"
  },
  processing: {
    label: "En cours",
    className: "border-sky-400/30 bg-sky-500/10 text-sky-100"
  },
  generated: {
    label: "Generee",
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

const isUploadedPropertyAsset = (value) => typeof value === "string" && value.startsWith("/uploads/properties/");

export const getPropertyThreeDStatusMeta = ({ is3DEnabled, status }) => {
  if (!is3DEnabled) {
    return PROPERTY_THREE_D_STATUS_META.disabled;
  }

  return PROPERTY_THREE_D_STATUS_META[status] || PROPERTY_THREE_D_STATUS_META.pending;
};

export const buildPropertyThreeDMedia = (property) => {
  const explicitSources = Array.isArray(property?.threeDSourceMedia) ? property.threeDSourceMedia : [];

  if (explicitSources.length) {
    return explicitSources;
  }

  const selected = [];
  const seen = new Set();
  const mediaItems = Array.isArray(property?.media) ? property.media : [];

  const pushUnique = (url, origin = "media") => {
    const normalizedUrl = typeof url === "string" ? url.trim() : "";

    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return;
    }

    seen.add(normalizedUrl);
    selected.push({ url: normalizedUrl, type: "image", origin });
  };

  mediaItems
    .filter((item) => item?.url && isUploadedPropertyAsset(item.url))
    .forEach((item) => pushUnique(item.type === "video" ? item.thumbnailUrl || item.url : item.url, "uploaded_media"));

  mediaItems
    .filter((item) => item?.type === "image" && item?.url)
    .forEach((item) => pushUnique(item.url, "media"));

  if (property?.coverImage) {
    pushUnique(property.coverImage, "cover");
  }

  return selected;
};
