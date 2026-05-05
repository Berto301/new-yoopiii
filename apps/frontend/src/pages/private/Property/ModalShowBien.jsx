import { useEffect, useMemo, useState } from "react";
import { DirectionsRenderer, GoogleMap, MarkerF } from "@react-google-maps/api";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { useSharedGoogleMapsLoader } from "../../../lib/utils/google-maps.js";
import { resolveAssetUrl } from "../../../lib/utils/asset-url.js";
import { resolveAvatarUrl } from "../../../components/profile/avatar.utils.js";

const DEFAULT_MAP_CENTER = { lat: -19.872006, lng: 47.03961 };
const TRAVEL_MODES = [
  { value: "DRIVING", labelKey: "driving", fallback: "Voiture" },
  { value: "WALKING", labelKey: "walking", fallback: "A pied" },
  { value: "TRANSIT", labelKey: "transit", fallback: "Transport" }
];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getPropertyCoordinates = (property) => {
  const lat = toNumber(property?.mapMarker?.lat ?? property?.location?.coordinates?.[1]);
  const lng = toNumber(property?.mapMarker?.lng ?? property?.location?.coordinates?.[0]);

  if (lat == null || lng == null) {
    return null;
  }

  return { lat, lng };
};

const formatCoordinates = (position) => {
  if (!position) return "-";
  return `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
};

const computeDistanceInKm = (from, to) => {
  if (!from || !to) return null;

  const earthRadiusKm = 6371;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const originLat = (from.lat * Math.PI) / 180;
  const targetLat = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
};

const buildSvgMarker = ({ label, fill }) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="31" fill="${fill}" stroke="white" stroke-width="5"/>
      <text x="36" y="43" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="white">${label}</text>
    </svg>
  `)}`;

const createMarkerIcon = ({ url, label, fill, size = 48 }) => {
  if (typeof window === "undefined" || !window.google?.maps) {
    return undefined;
  }

  return {
    url: url || buildSvgMarker({ label, fill }),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2)
  };
};

const buildGoogleMapsDirectionUrl = ({ origin, destination, travelMode }) => {
  if (!origin || !destination) return "";

  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: String(travelMode || "DRIVING").toLowerCase()
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const StatTile = ({ label, value, description }) => (
  <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
    <p className="mt-2 break-words text-base font-semibold text-[var(--foreground)]">{value}</p>
    {description ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p> : null}
  </div>
);

export const ModalShowBien = ({ open, property, user, onClose }) => {
  const { t, preferences } = useUserPreferences();
  const { googleMapsApiKey, isLoaded: isMapsLoaded, loadError } = useSharedGoogleMapsLoader();
  const [travelMode, setTravelMode] = useState("DRIVING");
  const [userPosition, setUserPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [geoError, setGeoError] = useState("");
  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState("");
  const destination = useMemo(() => getPropertyCoordinates(property), [property]);
  const fallbackDistance = useMemo(() => computeDistanceInKm(userPosition, destination), [destination, userPosition]);
  const googleMapsUrl = useMemo(
    () => buildGoogleMapsDirectionUrl({ origin: userPosition, destination, travelMode }),
    [destination, travelMode, userPosition]
  );
  const center = userPosition || destination || DEFAULT_MAP_CENTER;
  const isDarkTheme = preferences?.theme === "dark";

  useEffect(() => {
    if (!open) {
      setDirections(null);
      setRouteInfo(null);
      setRouteError("");
      setUserPosition(null);
      setGeoStatus("idle");
      setGeoError("");
      return;
    }

    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoError(t("private", "direction.errors.unsupported", "La geolocalisation n'est pas prise en charge par ce navigateur."));
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPosition({ lat: coords.latitude, lng: coords.longitude });
        setGeoStatus("success");
        setGeoError("");
      },
      (error) => {
        setGeoStatus("error");
        setGeoError(
          error?.code === error?.PERMISSION_DENIED
            ? t("private", "direction.errors.permission", "Autorisez la geolocalisation pour calculer l'itineraire depuis votre position actuelle.")
            : t("private", "direction.errors.position", "Impossible de recuperer votre position actuelle.")
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [open, t]);

  useEffect(() => {
    if (!open || !isMapsLoaded || !userPosition || !destination || !window.google?.maps) {
      setDirections(null);
      setRouteInfo(null);
      return;
    }

    let isCancelled = false;
    const service = new window.google.maps.DirectionsService();

    setRouteError("");
    service.route(
      {
        origin: userPosition,
        destination,
        travelMode: window.google.maps.TravelMode[travelMode] || window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false
      },
      (result, status) => {
        if (isCancelled) return;

        if (status === "OK" && result) {
          const leg = result.routes?.[0]?.legs?.[0] || null;
          setDirections(result);
          setRouteInfo({
            distanceText: leg?.distance?.text || (fallbackDistance != null ? `${fallbackDistance} km` : "-"),
            durationText: leg?.duration?.text || "-"
          });
          return;
        }

        setDirections(null);
        setRouteInfo(null);
        setRouteError(t("private", "direction.errors.route", "Impossible de calculer l'itineraire avec ces options."));
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [destination?.lat, destination?.lng, fallbackDistance, isMapsLoaded, open, t, travelMode, userPosition?.lat, userPosition?.lng]);

  const userMarkerIcon = useMemo(() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "User";
    return createMarkerIcon({ url: resolveAvatarUrl(user?.avatar, ""), label: fullName.slice(0, 2).toUpperCase(), fill: "#2563eb", size: 46 });
  }, [isMapsLoaded, user?.avatar, user?.email, user?.firstName, user?.lastName]);

  const propertyMarkerIcon = useMemo(() => {
    const coverUrl = property?.coverImage ? resolveAssetUrl(property.coverImage) : "";
    return createMarkerIcon({ url: coverUrl, label: "BI", fill: "#9d5d43", size: 54 });
  }, [isMapsLoaded, property?.coverImage]);

  const selectedTravelMode = TRAVEL_MODES.find((mode) => mode.value === travelMode) || TRAVEL_MODES[0];
  const distanceLabel = routeInfo?.distanceText || (fallbackDistance != null ? `${fallbackDistance} km` : "-");
  const durationLabel = routeInfo?.durationText || (fallbackDistance != null ? t("private", "direction.durationFallback", "Estimation via Google Maps indisponible") : "-");

  return (
    <ModalLayout
      open={open}
      title={t("private", "direction.title", "Voir direction")}
      onClose={onClose}
      panelClassName="max-w-6xl"
      footerContent={(
        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="px-5 py-3" onClick={onClose}>
            {t("private", "direction.close", "Fermer")}
          </Button>
          {googleMapsUrl ? (
            <Button as="a" href={googleMapsUrl} target="_blank" rel="noreferrer" className="px-5 py-3">
              {t("private", "direction.openGoogleMaps", "Ouvrir dans Google Maps")}
            </Button>
          ) : null}
        </div>
      )}
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(157,93,67,0.16),transparent_28%),var(--surface)]">
          <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:p-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">{t("private", "direction.eyebrow", "Itineraire du bien")}</p>
              <h3 className="text-2xl font-semibold text-[var(--foreground)]">{property?.title || t("private", "direction.propertyFallback", "Bien selectionne")}</h3>
              <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {t("private", "direction.description", "Visualisez votre trajet depuis votre position actuelle jusqu'au bien, avec une estimation claire et un acces direct a Google Maps.")}
              </p>
              <div className="flex flex-wrap gap-2">
                {property?.type ? <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{property.type}</Badge> : null}
                {property?.purpose ? <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{property.purpose}</Badge> : null}
                {geoStatus === "loading" ? <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-300">{t("private", "direction.geoLoading", "Position en cours")}</Badge> : null}
                {geoStatus === "success" ? <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{t("private", "direction.geoReady", "Position active")}</Badge> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatTile label={t("private", "direction.stats.distance", "Distance estimee")} value={distanceLabel} />
              <StatTile label={t("private", "direction.stats.duration", "Temps estime")} value={durationLabel} />
              <StatTile label={t("private", "direction.stats.mode", "Deplacement")} value={t("private", `direction.modes.${selectedTravelMode.labelKey}`, selectedTravelMode.fallback)} />
              <StatTile label={t("private", "direction.stats.position", "Votre position")} value={formatCoordinates(userPosition)} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] p-0">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "direction.mapTitle", "Carte et trajet")}</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{t("private", "direction.mapDescription", "Markers personnalises: vous et le bien.")}</p>
                </div>
                <label className="block min-w-[190px] space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "direction.travelMode", "Mode")}</span>
                  <select
                    value={travelMode}
                    onChange={(event) => setTravelMode(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-brand-500"
                  >
                    {TRAVEL_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value} className={isDarkTheme ? "bg-stone-950 text-white" : "bg-white text-stone-950"}>
                        {t("private", `direction.modes.${mode.labelKey}`, mode.fallback)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="p-4">
              <div className="overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-soft)]">
                {!destination ? (
                  <div className="flex h-[520px] items-center justify-center px-6 text-center text-sm text-amber-300">
                    {t("private", "direction.errors.noDestination", "Aucune coordonnee GPS n'est disponible pour ce bien.")}
                  </div>
                ) : !googleMapsApiKey ? (
                  <div className="flex h-[520px] items-center justify-center px-6 text-center text-sm text-amber-300">
                    {t("private", "direction.errors.missingKey", "Ajoutez `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` pour activer la carte.")}
                  </div>
                ) : loadError ? (
                  <div className="flex h-[520px] items-center justify-center px-6 text-center text-sm text-red-300">
                    {t("private", "direction.errors.maps", "Impossible de charger Google Maps pour le moment.")}
                  </div>
                ) : !isMapsLoaded ? (
                  <div className="flex h-[520px] items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
                    {t("private", "direction.mapLoading", "Chargement de la carte Google...")}
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerClassName="h-[520px] w-full"
                    center={center}
                    zoom={userPosition && destination ? 13 : 15}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true,
                      clickableIcons: false
                    }}
                  >
                    {directions ? <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, preserveViewport: false }} /> : null}
                    {userPosition ? <MarkerF position={userPosition} icon={userMarkerIcon} title={t("private", "direction.userMarker", "Vous")} /> : null}
                    {destination ? <MarkerF position={destination} icon={propertyMarkerIcon} title={property?.title || "Bien"} /> : null}
                  </GoogleMap>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {geoError ? (
              <Card className="border-amber-500/25 bg-amber-500/10">
                <p className="text-sm font-semibold text-amber-200">{t("private", "direction.permissionTitle", "Position non disponible")}</p>
                <p className="mt-2 text-sm leading-6 text-amber-100/90">{geoError}</p>
              </Card>
            ) : null}

            {routeError ? (
              <Card className="border-red-500/25 bg-red-500/10">
                <p className="text-sm font-semibold text-red-200">{t("private", "direction.routeTitle", "Itineraire indisponible")}</p>
                <p className="mt-2 text-sm leading-6 text-red-100/90">{routeError}</p>
              </Card>
            ) : null}

            <Card className="border-[var(--border)] bg-[var(--surface)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "direction.propertyDetails", "Details du bien")}</p>
              {property?.coverImage ? (
                <img src={resolveAssetUrl(property.coverImage)} alt={property.title} className="mt-4 h-44 w-full rounded-[1.4rem] object-cover" />
              ) : null}
              <div className="mt-4 space-y-3">
                <h4 className="text-xl font-semibold text-[var(--foreground)]">{property?.title || t("private", "direction.propertyFallback", "Bien selectionne")}</h4>
                <p className="text-sm leading-6 text-[var(--muted)]">{property?.address || t("private", "direction.addressMissing", "Adresse non renseignee")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile label={t("private", "direction.stats.destination", "Destination")} value={formatCoordinates(destination)} />
                  <StatTile label={t("private", "direction.stats.agent", "Agent")} value={property?.agentName || t("private", "direction.agentMissing", "Non attribue")} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ModalLayout>
  );
};

export default ModalShowBien;
