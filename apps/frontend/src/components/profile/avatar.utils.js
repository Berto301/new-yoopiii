export const DEFAULT_AVATAR_URL =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

const resolveApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

  try {
    return new URL(baseUrl);
  } catch (_error) {
    return null;
  }
};

const API_BASE_URL = resolveApiBaseUrl();

export const resolveAvatarUrl = (src, fallback = DEFAULT_AVATAR_URL) => {
  const normalizedSource = typeof src === "string" ? src.trim() : "";

  if (!normalizedSource) {
    return fallback;
  }

  try {
    if (/^https?:\/\//i.test(normalizedSource)) {
      return normalizedSource;
    }

    if (normalizedSource.startsWith("/")) {
      return API_BASE_URL ? new URL(normalizedSource, API_BASE_URL.origin).toString() : normalizedSource;
    }

    if (API_BASE_URL) {
      return new URL(normalizedSource, API_BASE_URL.toString()).toString();
    }
  } catch (_error) {
    return fallback;
  }

  return normalizedSource;
};

export const getInitials = (value, type = "user") => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return type === "agent" ? "AG" : "US";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};
