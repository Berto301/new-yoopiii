import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { DirectionsRenderer, GoogleMap, MarkerF, OverlayView } from "@react-google-maps/api";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { BaseListBox } from "../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../components/layout/modals/ModalLayout.jsx";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { Switch } from "../../components/ui/Switch.jsx";
import { socket } from "../../lib/socket/socket.js";
import { useSharedGoogleMapsLoader } from "../../lib/utils/google-maps.js";
import { formatParticipantName, isAgentRole } from "./appointment.utils.js";

const DEFAULT_MAP_CENTER = { lat: -19.872006, lng: 47.03961 };

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false
};

const defaultValues = {
  travelMode: "DRIVING",
  avoidFerries: false,
  avoidHighways: false,
  avoidTolls: false
};

const toFiniteNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const normalizePosition = (input, source = "stored") => {
  const lat = toFiniteNumber(input?.lat ?? input?.latitude);
  const lng = toFiniteNumber(input?.lng ?? input?.longitude);

  if (lat == null || lng == null) {
    return null;
  }

  return {
    lat,
    lng,
    accuracy: toFiniteNumber(input?.accuracy),
    heading: toFiniteNumber(input?.heading),
    speed: toFiniteNumber(input?.speed),
    updatedAt: input?.updatedAt || input?.timestamp || new Date().toISOString(),
    source
  };
};

const resolveKnownPosition = (profile) => {
  const directPosition = normalizePosition(profile?.position || profile?.currentPosition || profile?.lastPosition, "stored");

  if (directPosition) {
    return directPosition;
  }

  const coordinates = profile?.location?.coordinates;

  if (Array.isArray(coordinates)) {
    const pointPosition = normalizePosition({ lat: coordinates[1], lng: coordinates[0] }, "stored");

    if (pointPosition) {
      return pointPosition;
    }
  }

  const smartMatchingLocation = profile?.smartMatchingLocation || profile?.preferences?.smartMatching?.location;

  if (smartMatchingLocation?.enabled) {
    return normalizePosition(smartMatchingLocation, "stored");
  }

  return null;
};

const toLatLngLiteral = (position) => ({
  lat: Number(position.lat),
  lng: Number(position.lng)
});

const formatCoordinate = (value) => Number(value || 0).toFixed(5);

const getRouteSummary = (directions) => {
  const leg = directions?.routes?.[0]?.legs?.[0];

  if (!leg) {
    return null;
  }

  return {
    distance: leg.distance?.text || "-",
    duration: leg.duration?.text || "-",
    startAddress: leg.start_address || "",
    endAddress: leg.end_address || ""
  };
};

const PositionMarker = ({ profile, position, label, tone = "brand" }) => {
  if (!position) {
    return null;
  }

  const color = tone === "participant" ? "#2563eb" : "#9d5d43";
  const name = formatParticipantName(profile);

  return (
    <>
      <MarkerF
        position={toLatLngLiteral(position)}
        label={{
          text: label,
          color: "#ffffff",
          fontWeight: "700"
        }}
        icon={{
          path: window.google?.maps?.SymbolPath?.CIRCLE,
          scale: 18,
          fillColor: color,
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeOpacity: 1,
          strokeWeight: 3
        }}
      />
      <OverlayView position={toLatLngLiteral(position)} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        <div className="-translate-x-1/2 -translate-y-[5.2rem] rounded-full border border-white/70 bg-stone-950/90 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
          <Avatar
            src={profile?.avatar}
            alt={`Photo de ${name}`}
            name={name}
            size="sm"
            variant="message"
            type={isAgentRole(profile?.role) ? "agent" : "user"}
          />
        </div>
      </OverlayView>
    </>
  );
};

export const ModalShowPositions = ({
  open,
  conversationId,
  currentUser,
  participant,
  onClose
}) => {
  const { locale, t } = useUserPreferences();
  const { googleMapsApiKey, isLoaded: isMapsLoaded, loadError } = useSharedGoogleMapsLoader();
  const mapRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const [currentUserPosition, setCurrentUserPosition] = useState(null);
  const [participantPosition, setParticipantPosition] = useState(null);
  const [positionError, setPositionError] = useState("");
  const [directions, setDirections] = useState(null);
  const [directionsError, setDirectionsError] = useState("");
  const [isCalculatingDirections, setIsCalculatingDirections] = useState(false);

  const { control, reset, watch } = useForm({ defaultValues });
  const travelMode = watch("travelMode");
  const avoidFerries = watch("avoidFerries");
  const avoidHighways = watch("avoidHighways");
  const avoidTolls = watch("avoidTolls");

  const currentUserName = formatParticipantName(currentUser);
  const participantName = formatParticipantName(participant);
  const routeSummary = useMemo(() => getRouteSummary(directions), [directions]);

  const travelModeOptions = useMemo(() => ([
    { label: t("private", "messages.positions.travelModes.driving", "Voiture"), value: "DRIVING" },
    { label: t("private", "messages.positions.travelModes.walking", "Marche"), value: "WALKING" },
    { label: t("private", "messages.positions.travelModes.bicycling", "Velo"), value: "BICYCLING" },
    { label: t("private", "messages.positions.travelModes.transit", "Transport"), value: "TRANSIT" }
  ]), [t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(defaultValues);
    setCurrentUserPosition(resolveKnownPosition(currentUser));
    setParticipantPosition(resolveKnownPosition(participant));
    setPositionError("");
    setDirections(null);
    setDirectionsError("");
  }, [currentUser?.id, open, participant?.id, reset]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPositionError(t("private", "messages.positions.errors.geolocationUnsupported", "La geolocalisation n'est pas disponible sur ce navigateur."));
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const nextPosition = normalizePosition({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading,
          speed: coords.speed,
          timestamp: new Date(timestamp || Date.now()).toISOString()
        }, "gps");

        if (!nextPosition) {
          return;
        }

        setCurrentUserPosition(nextPosition);
        setPositionError("");
      },
      (error) => {
        const message = error?.code === error?.PERMISSION_DENIED
          ? t("private", "messages.positions.errors.permissionDenied", "Autorisez l'acces a votre position pour afficher l'itineraire depuis votre position actuelle.")
          : t("private", "messages.positions.errors.positionFailed", "Impossible de recuperer votre position actuelle.");

        setPositionError(message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [open, t]);

  useEffect(() => {
    if (!open || !conversationId) {
      return undefined;
    }

    return () => {
      if (socket.connected) {
        socket.emit("conversation:position:stop", { conversationId }, () => {});
      }
    };
  }, [conversationId, open]);

  useEffect(() => {
    if (!open || !conversationId || !currentUserPosition) {
      return undefined;
    }

    const sharePosition = () => {
      socket.emit("conversation:position:share", {
        conversationId,
        position: currentUserPosition
      }, () => {});
    };

    if (socket.connected) {
      sharePosition();
    }

    socket.on("connect", sharePosition);

    return () => {
      socket.off("connect", sharePosition);
    };
  }, [
    conversationId,
    currentUserPosition?.accuracy,
    currentUserPosition?.lat,
    currentUserPosition?.lng,
    currentUserPosition?.updatedAt,
    open
  ]);

  useEffect(() => {
    if (!open || !conversationId || !participant?.id) {
      return undefined;
    }

    const handlePositionUpdate = (payload) => {
      if (payload?.conversationId !== conversationId || payload?.userId !== participant.id) {
        return;
      }

      const nextPosition = normalizePosition(payload.position, "socket");

      if (nextPosition) {
        setParticipantPosition(nextPosition);
      }
    };

    const handlePositionStop = (payload) => {
      if (payload?.conversationId !== conversationId || payload?.userId !== participant.id) {
        return;
      }

      setParticipantPosition((currentPosition) =>
        currentPosition
          ? { ...currentPosition, source: "stored" }
          : currentPosition
      );
    };

    socket.on("conversation:position:update", handlePositionUpdate);
    socket.on("conversation:position:stop", handlePositionStop);

    return () => {
      socket.off("conversation:position:update", handlePositionUpdate);
      socket.off("conversation:position:stop", handlePositionStop);
    };
  }, [conversationId, open, participant?.id]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) {
      return;
    }

    const visiblePositions = [currentUserPosition, participantPosition].filter(Boolean);

    if (!visiblePositions.length) {
      mapRef.current.panTo(DEFAULT_MAP_CENTER);
      mapRef.current.setZoom(12);
      return;
    }

    if (visiblePositions.length === 1) {
      mapRef.current.panTo(toLatLngLiteral(visiblePositions[0]));
      mapRef.current.setZoom(15);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    visiblePositions.forEach((position) => bounds.extend(toLatLngLiteral(position)));
    mapRef.current.fitBounds(bounds, 80);
  }, [
    currentUserPosition?.lat,
    currentUserPosition?.lng,
    participantPosition?.lat,
    participantPosition?.lng
  ]);

  useEffect(() => {
    if (!open || !isMapsLoaded || !window.google?.maps || !currentUserPosition || !participantPosition) {
      setDirections(null);
      setIsCalculatingDirections(false);
      return undefined;
    }

    let isCancelled = false;
    setIsCalculatingDirections(true);
    setDirectionsError("");

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    }

    directionsServiceRef.current.route(
      {
        origin: toLatLngLiteral(currentUserPosition),
        destination: toLatLngLiteral(participantPosition),
        travelMode: window.google.maps.TravelMode[travelMode] || window.google.maps.TravelMode.DRIVING,
        avoidFerries,
        avoidHighways,
        avoidTolls
      },
      (result, status) => {
        if (isCancelled) {
          return;
        }

        setIsCalculatingDirections(false);

        if (status === "OK" && result) {
          setDirections(result);
          setDirectionsError("");
          return;
        }

        setDirections(null);
        setDirectionsError(t("private", "messages.positions.errors.directionsFailed", "Impossible de calculer l'itineraire avec ces options."));
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [
    avoidFerries,
    avoidHighways,
    avoidTolls,
    currentUserPosition,
    isMapsLoaded,
    open,
    participantPosition,
    t,
    travelMode
  ]);

  const currentPositionLabel = currentUserPosition
    ? `${formatCoordinate(currentUserPosition.lat)}, ${formatCoordinate(currentUserPosition.lng)}`
    : t("private", "messages.positions.status.waitingCurrent", "En attente de votre position");
  const participantPositionLabel = participantPosition
    ? `${formatCoordinate(participantPosition.lat)}, ${formatCoordinate(participantPosition.lng)}`
    : t("private", "messages.positions.status.waitingParticipant", "En attente de la position du participant");
  const lastUpdateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }), [locale]);
  const lastCurrentUpdate = currentUserPosition?.updatedAt
    ? lastUpdateFormatter.format(new Date(currentUserPosition.updatedAt))
    : "-";
  const lastParticipantUpdate = participantPosition?.updatedAt
    ? lastUpdateFormatter.format(new Date(participantPosition.updatedAt))
    : "-";

  return (
    <ModalLayout
      open={open}
      title={t("private", "messages.positions.title", "Positions en temps reel")}
      saveLabel={t("private", "messages.positions.actions.ok", "OK")}
      cancelLabel={t("private", "messages.positions.actions.close", "Fermer")}
      onClose={onClose}
      onSave={onClose}
      panelClassName="max-w-6xl"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm leading-6 text-stone-300">
              {t("private", "messages.positions.subtitle", "Itineraire live entre")} {currentUserName} {t("private", "messages.positions.subtitleConnector", "et")} {participantName}.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t("private", "messages.positions.labels.you", "Vous")}</p>
                <p className="mt-2 text-sm font-semibold text-white">{currentUserName}</p>
                <p className="mt-1 text-xs text-stone-400">{currentPositionLabel}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">{t("private", "messages.positions.labels.updatedAt", "MAJ")} {lastCurrentUpdate}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t("private", "messages.positions.labels.participant", "Participant")}</p>
                <p className="mt-2 text-sm font-semibold text-white">{participantName}</p>
                <p className="mt-1 text-xs text-stone-400">{participantPositionLabel}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">{t("private", "messages.positions.labels.updatedAt", "MAJ")} {lastParticipantUpdate}</p>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-brand-500/15 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("private", "messages.positions.labels.distance", "Distance")}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{routeSummary?.distance || "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-sky-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("private", "messages.positions.labels.duration", "Duree")}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{routeSummary?.duration || "-"}</p>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-20 rounded-2xl border border-white/10 bg-stone-950/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="grid gap-4 xl:grid-cols-[220px_1fr] xl:items-end">
            <Controller
              name="travelMode"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label={t("private", "messages.positions.controls.travelMode", "Mode de trajet")}
                  options={travelModeOptions}
                  value={travelModeOptions.find((option) => option.value === field.value) || travelModeOptions[0]}
                  onChange={(option) => field.onChange(option?.value || "DRIVING")}
                />
              )}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Controller
                name="avoidFerries"
                control={control}
                render={({ field }) => (
                  <Switch
                    label={t("private", "messages.positions.controls.avoidFerries", "Eviter ferries")}
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="avoidHighways"
                control={control}
                render={({ field }) => (
                  <Switch
                    label={t("private", "messages.positions.controls.avoidHighways", "Eviter autoroutes")}
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="avoidTolls"
                control={control}
                render={({ field }) => (
                  <Switch
                    label={t("private", "messages.positions.controls.avoidTolls", "Eviter peages")}
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-stone-900/70 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
          {!googleMapsApiKey ? (
            <div className="flex h-[500px] items-center justify-center px-6 text-center text-sm leading-6 text-stone-400">
              {t("private", "messages.positions.errors.missingApiKey", "Ajoutez `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` pour activer Google Maps.")}
            </div>
          ) : loadError ? (
            <div className="flex h-[500px] items-center justify-center px-6 text-center text-sm leading-6 text-red-300">
              {t("private", "messages.positions.errors.mapLoadFailed", "Impossible de charger Google Maps pour le moment.")}
            </div>
          ) : !isMapsLoaded ? (
            <div className="flex h-[500px] items-center justify-center px-6 text-center text-sm leading-6 text-stone-400">
              {t("private", "messages.positions.status.mapLoading", "Chargement de la carte Google...")}
            </div>
          ) : (
            <div className="relative">
              <GoogleMap
                mapContainerClassName="h-[500px] w-full"
                center={currentUserPosition ? toLatLngLiteral(currentUserPosition) : participantPosition ? toLatLngLiteral(participantPosition) : DEFAULT_MAP_CENTER}
                zoom={currentUserPosition || participantPosition ? 14 : 12}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
                onUnmount={() => {
                  mapRef.current = null;
                }}
              >
                {directions ? (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      suppressMarkers: true,
                      preserveViewport: true,
                      polylineOptions: {
                        strokeColor: "#9d5d43",
                        strokeOpacity: 0.9,
                        strokeWeight: 6
                      }
                    }}
                  />
                ) : null}
                <PositionMarker profile={currentUser} position={currentUserPosition} label="V" />
                <PositionMarker profile={participant} position={participantPosition} label="P" tone="participant" />
              </GoogleMap>

              {isCalculatingDirections ? (
                <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-stone-950/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-lg">
                  {t("private", "messages.positions.status.calculating", "Calcul itineraire...")}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {(positionError || directionsError) ? (
          <div className="grid gap-3 md:grid-cols-2">
            {positionError ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                {positionError}
              </div>
            ) : null}
            {directionsError ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                {directionsError}
              </div>
            ) : null}
          </div>
        ) : null}

        {routeSummary?.startAddress || routeSummary?.endAddress ? (
          <div className="grid gap-3 text-sm leading-6 text-stone-300 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t("private", "messages.positions.labels.origin", "Depart")}</p>
              <p className="mt-2">{routeSummary.startAddress || currentPositionLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t("private", "messages.positions.labels.destination", "Arrivee")}</p>
              <p className="mt-2">{routeSummary.endAddress || participantPositionLabel}</p>
            </div>
          </div>
        ) : null}

      </div>
    </ModalLayout>
  );
};

export default ModalShowPositions;
