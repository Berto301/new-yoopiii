import { useEffect, useMemo, useState } from "react";

export const GOOGLE_MAPS_LIBRARIES = [];
const GOOGLE_MAPS_SCRIPT_ID = "shared-google-maps-script";
const GOOGLE_MAPS_CALLBACK = "__yopiiGoogleMapsInit";

let googleMapsLoadPromise = null;

const isGoogleMapsLoaded = () =>
  typeof window !== "undefined" && Boolean(window.google?.maps);

const buildGoogleMapsScriptUrl = (apiKey) => {
  const params = new URLSearchParams({
    key: apiKey,
    v: "weekly",
    loading: "async",
    callback: GOOGLE_MAPS_CALLBACK
  });

  if (GOOGLE_MAPS_LIBRARIES.length) {
    params.set("libraries", GOOGLE_MAPS_LIBRARIES.join(","));
  }

  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
};

const loadGoogleMaps = (apiKey) => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (isGoogleMapsLoaded()) {
    return Promise.resolve();
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    window[GOOGLE_MAPS_CALLBACK] = () => {
      const script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
      if (script) script.dataset.loaded = "true";
      resolve();
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === "true" || isGoogleMapsLoaded()) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => {
        if (isGoogleMapsLoaded()) resolve();
      }, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = buildGoogleMapsScriptUrl(apiKey);
    script.async = true;
    script.defer = true;
    script.dataset.apiProvider = "google";
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

export const useSharedGoogleMapsLoader = () => {
  const googleMapsApiKey = useMemo(() => {
    const rawKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || "";
    const normalizedKey = String(rawKey || "").trim();
    return normalizedKey && normalizedKey !== "change-me" ? normalizedKey : "";
  }, []);
  const [state, setState] = useState({
    isLoaded: isGoogleMapsLoaded(),
    loadError: null
  });

  useEffect(() => {
    let cancelled = false;

    if (!googleMapsApiKey) {
      setState({ isLoaded: false, loadError: null });
      return () => {
        cancelled = true;
      };
    }

    if (isGoogleMapsLoaded()) {
      setState({ isLoaded: true, loadError: null });
      return () => {
        cancelled = true;
      };
    }

    loadGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (!cancelled) {
          setState({ isLoaded: isGoogleMapsLoaded(), loadError: null });
        }
      })
      .catch((error) => {
        googleMapsLoadPromise = null;
        if (!cancelled) {
          setState({ isLoaded: false, loadError: error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey]);

  return {
    googleMapsApiKey,
    ...state
  };
};
