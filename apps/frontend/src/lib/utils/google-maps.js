import { useJsApiLoader } from "@react-google-maps/api";

export const GOOGLE_MAPS_LIBRARIES = [];

export const useSharedGoogleMapsLoader = () => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || "";

  const loader = useJsApiLoader({
    id: "shared-google-maps-script",
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  return {
    googleMapsApiKey,
    ...loader
  };
};
