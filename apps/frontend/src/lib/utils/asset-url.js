const resolveApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

  try {
    return new URL(baseUrl);
  } catch (_error) {
    return null;
  }
};

const API_BASE_URL = resolveApiBaseUrl();

export const resolveAssetUrl = (src, fallback = "") => {
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
