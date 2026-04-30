import { useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { ScoreBadge } from "../../components/ui/ScoreBadge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { BaseListBox } from "../../components/form/BaseListBox.jsx";
import { useSharedGoogleMapsLoader } from "../../lib/utils/google-maps.js";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";
import { createConversation } from "../../features/chat/services/chat.service.js";
import { SMART_MATCHING_PROPERTY_TYPE_OPTIONS } from "../../features/matching/matching.constants.js";
import { buildDefaultPublicationFilters } from "../../features/matching/matching.utils.js";
import { ModalViewDetail } from "../../features/properties/components/ModalViewDetail.jsx";
import { usePropertyWorkspace } from "../../features/properties/hooks/usePropertyWorkspace.js";
import { hasPropertyThreeDLink } from "../../features/properties/property-3d.js";
import { SettingsTabButton } from "./settings/SettingsTabButton.jsx";

const DEFAULT_SEARCH_CENTER = { lat: -19.872006, lng: 47.03961 };
const DEFAULT_MAP_ZOOM = 12;
const INITIAL_VISIBLE_ITEMS = 12;
const ALL_OPTION = { label: "Tous", value: "all" };

const formatPrice = (value, currency = "USD") => formatMoney(value, currency);

const getStatusBadgeClassName = (property) => {
  if (property.status === "reserved") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
};

const buildOwnerInitials = (name) =>
  String(name || "PR")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const getCoordinates = (property) => {
  const lat = Number(property?.mapMarker?.lat ?? property?.location?.coordinates?.[1]);
  const lng = Number(property?.mapMarker?.lng ?? property?.location?.coordinates?.[0]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
};

const computeDistanceInKm = (from, to) => {
  if (!from || !to) {
    return null;
  }

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

const getFilterOptions = (items, key, fallbackLabel) => [
  ALL_OPTION,
  ...[...new Map(
    items
      .filter((item) => item[key])
      .map((item) => [
        item[key],
        {
          label: item[fallbackLabel] || item[key],
          value: item[key]
        }
      ])
  ).values()]
];

const PublicationsLoading = () => (
  <section className="space-y-8">
    <SectionTitle
      eyebrow="Publications"
      title="Publication des biens"
      description="Chargement de la liste et de la carte des biens publies."
    />
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-0"
        >
          <div className="grid min-h-[320px] animate-pulse gap-0 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-stone-900/80" />
            <div className="space-y-4 p-6">
              <div className="h-6 w-2/3 rounded-full bg-white/10" />
              <div className="h-4 w-full rounded-full bg-white/10" />
              <div className="h-4 w-5/6 rounded-full bg-white/10" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded-2xl bg-white/10" />
                <div className="h-24 rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </section>
);

const PublicationCard = ({
  property,
  user,
  favoriteMutation,
  reservationMutation,
  onDiscuss,
  onOpenOwnerConversation,
  onOpenDetail,
  t
}) => {
  const mediaPreview = property.media?.slice(0, 3) || [];
  const isReservedByOtherUser = property.status === "reserved" && !property.isReservedByCurrentUser;
  const isReserveActionDisabled = reservationMutation.isPending || property.status !== "published";
  const ownerDisplay = property.publicationOwnerDisplay;
  const showOwnerBlock =
    ownerDisplay &&
    (ownerDisplay.showOwnerName || ownerDisplay.showOwnerContact || ownerDisplay.allowDirectOwnerChat);
  const canManageReservation = ["agency", "agency_agent", "independent_agent"].includes(user?.role);
  const canFavoriteProperties = user?.role === "user";

  return (
    <Card
      key={property.id}
      className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-0"
    >
      <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[320px] bg-stone-900">
          {property.coverImage ? (
            <img src={resolveAssetUrl(property.coverImage)} alt={property.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(12,10,9,0.95))] text-sm uppercase tracking-[0.2em] text-stone-200">
              Publication immobiliere
            </div>
          )}

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge className={getStatusBadgeClassName(property)}>{property.status}</Badge>
            <Badge>{property.purpose}</Badge>
            <Badge className="border-white/10 bg-black/30 text-white">{property.type}</Badge>
            {property.isUnderMaintenance ? (
              <Badge className="border-amber-400/30 bg-amber-500/15 text-amber-100">En maintenance</Badge>
            ) : null}
            <ScoreBadge score={property.score || 0} showScore />
            {property.distanceFromReferenceKm != null ? (
              <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-100">
                {property.distanceFromReferenceKm} km
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold text-white">{property.title}</h3>
              {hasPropertyThreeDLink(property) ? <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-100">3D</Badge> : null}
              <ScoreBadge score={property.score || 0} showScore />
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-300">{property.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Prix</p>
              <p className="mt-2 text-xl font-semibold text-brand-100">{formatPrice(property.price, property.currency)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Adresse</p>
              <p className="mt-2 text-sm text-white">{property.address}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Agent</p>
              <p className="mt-2 text-sm text-white">{property.agentName || "Non attribue"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Agence</p>
              <p className="mt-2 text-sm text-white">{property.agencyName || "Aucune agence"}</p>
            </div>
          </div>

          {showOwnerBlock ? (
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Proprietaire affiche</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {property.ownerAvatar ? (
                    <img src={resolveAssetUrl(property.ownerAvatar)} alt={property.ownerName || "Proprietaire"} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm font-semibold text-white">
                      {buildOwnerInitials(property.ownerName)}
                    </div>
                  )}
                  <div className="space-y-1">
                    {ownerDisplay.showOwnerName ? <p className="text-sm font-semibold text-white">{property.ownerName || "Proprietaire"}</p> : <p className="text-sm font-semibold text-white">Proprietaire</p>}
                    {ownerDisplay.showOwnerContact ? (
                      <p className="text-sm text-stone-300">{property.ownerPhone || property.ownerEmail || "Contact non renseigne"}</p>
                    ) : null}
                  </div>
                </div>
                {ownerDisplay.allowDirectOwnerChat ? (
                  <Button type="button" variant="secondary" onClick={() => onOpenOwnerConversation(property)}>
                    {t("private", "publications.actions.contactOwner", "Discuter avec le proprietaire")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-white/5 text-stone-200">{property.area} m2</Badge>
            <Badge className="border-white/10 bg-white/5 text-stone-200">{property.rooms} pieces</Badge>
            <Badge className="border-white/10 bg-white/5 text-stone-200">{property.bedrooms} chambres</Badge>
            <Badge className="border-white/10 bg-white/5 text-stone-200">{property.bathrooms} salles de bain</Badge>
            <Badge className="border-white/10 bg-white/5 text-stone-200">{property.favoriteCount} favoris</Badge>
          </div>

          {property.features?.length ? (
            <div className="flex flex-wrap gap-2">
              {property.features.map((feature) => (
                <span key={feature} className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-300">
                  {feature}
                </span>
              ))}
            </div>
          ) : null}

          {mediaPreview.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {mediaPreview.map((mediaItem, index) => (
                <div key={`${property.id}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-stone-900/70">
                  <img
                    src={resolveAssetUrl(mediaItem.thumbnailUrl || mediaItem.url)}
                    alt={`${property.title} media ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
            <Button type="button" variant="secondary" onClick={() => onDiscuss(property)}>
              {t("private", "publications.actions.discuss", "Discuter")}
            </Button>

            <Button type="button" variant="ghost" onClick={() => onOpenDetail(property)}>
              {t("private", "publications.actions.viewDetail", "Voir detail")}
            </Button>

            <Button
              type="button"
              variant={property.isFavorite ? "secondary" : "primary"}
              disabled={favoriteMutation.isPending || !canFavoriteProperties}
              onClick={() => favoriteMutation.mutate({ propertyId: property.id, isFavorite: property.isFavorite })}
            >
              {!canFavoriteProperties
                ? t("private", "publications.actions.favoriteUnavailable", "Favori indisponible")
                : property.isFavorite
                  ? t("private", "publications.actions.removeFavorite", "Retirer des favoris")
                  : t("private", "publications.actions.addFavorite", "Mettre en favori")}
            </Button>

            {!canManageReservation ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isReserveActionDisabled}
                onClick={() => reservationMutation.mutate({ propertyId: property.id, action: "reserve" })}
              >
                {property.isReservedByCurrentUser
                  ? t("private", "publications.actions.reservedByYou", "Reserve par vous")
                  : isReservedByOtherUser
                    ? t("private", "publications.actions.alreadyReserved", "Deja reserve")
                    : t("private", "publications.actions.reserve", "Reserver")}
              </Button>
            ) : property.status === "reserved" ? (
              <Button
                type="button"
                variant="secondary"
                className="border-amber-500/40 text-amber-100 hover:border-amber-400 hover:bg-amber-500/10"
                disabled={reservationMutation.isPending}
                onClick={() => reservationMutation.mutate({ propertyId: property.id, action: "release" })}
              >
                {t("private", "publications.actions.cancelReservation", "Annuler la reservation")}
              </Button>
            ) : (
              <span className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-stone-400">
                {t("private", "publications.actions.available", "Disponible")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const PublicationsPage = () => {
  const { t } = useUserPreferences();
  const navigate = useNavigate();
  const { user, propertyPublicationsQuery, favoriteMutation, reservationMutation } = usePropertyWorkspace();
  const { googleMapsApiKey, isLoaded: isMapsLoaded, loadError } = useSharedGoogleMapsLoader();
  const [activeTab, setActiveTab] = useState("list");
  const [selectedMarkerId, setSelectedMarkerId] = useState("");
  const [detailModalIdentifier, setDetailModalIdentifier] = useState("");
  const [referenceCenter, setReferenceCenter] = useState(DEFAULT_SEARCH_CENTER);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [hasAppliedUserDefaultFilters, setHasAppliedUserDefaultFilters] = useState(false);
  const [rawFilters, setRawFilters] = useState({
    distanceKm: "all",
    agentId: "all",
    agencyId: "all",
    purpose: "all",
    type: "all",
    budgetMax: ""
  });
  const [debouncedFilters, setDebouncedFilters] = useState(rawFilters);
  const items = propertyPublicationsQuery.data?.items || [];
  const distanceOptions = useMemo(() => [
    { label: t("private", "publications.filters.allDistances", "Toutes distances"), value: "all" },
    { label: "1 km", value: "1" },
    { label: "5 km", value: "5" },
    { label: "100 km", value: "100" }
  ], [t]);
  const purposeOptions = useMemo(() => [
    { label: t("private", "publications.filters.allPurposes", "Tous objectifs"), value: "all" },
    { label: "Location", value: "rent" },
    { label: "Vente", value: "sale" }
  ], [t]);
  const typeOptions = useMemo(() => [
    { label: t("private", "publications.filters.allTypes", "Tous types"), value: "all" },
    ...SMART_MATCHING_PROPERTY_TYPE_OPTIONS
  ], [t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedFilters(rawFilters);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [rawFilters]);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setReferenceCenter({
          lat: coords.latitude,
          lng: coords.longitude
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }, []);

  useEffect(() => {
    if (!user || user.role !== "user" || hasAppliedUserDefaultFilters) {
      return;
    }

    const defaultFilters = buildDefaultPublicationFilters(user);

    setRawFilters((current) => ({
      ...current,
      purpose: current.purpose === "all" ? defaultFilters.purpose : current.purpose,
      type: current.type === "all" ? defaultFilters.type : current.type,
      distanceKm: current.distanceKm === "all" ? defaultFilters.distanceKm : current.distanceKm,
      budgetMax: current.budgetMax || defaultFilters.budgetMax
    }));
    setHasAppliedUserDefaultFilters(true);
  }, [hasAppliedUserDefaultFilters, user]);

  const agentOptions = useMemo(() => getFilterOptions(items, "agentId", "agentName"), [items]);
  const agencyOptions = useMemo(() => getFilterOptions(items, "agencyId", "agencyName"), [items]);

  const filteredItems = useMemo(() => {
    return items
      .map((property) => {
        const coordinates = getCoordinates(property);
        const distanceFromReferenceKm = computeDistanceInKm(referenceCenter, coordinates);

        return {
          ...property,
          coordinates,
          distanceFromReferenceKm
        };
      })
      .filter((property) => {
        if (debouncedFilters.agentId !== "all" && property.agentId !== debouncedFilters.agentId) {
          return false;
        }

        if (debouncedFilters.agencyId !== "all" && property.agencyId !== debouncedFilters.agencyId) {
          return false;
        }

        if (debouncedFilters.purpose !== "all" && property.purpose !== debouncedFilters.purpose) {
          return false;
        }

        if (debouncedFilters.type !== "all" && property.type !== debouncedFilters.type) {
          return false;
        }

        if (debouncedFilters.budgetMax) {
          const maximumBudget = Number(debouncedFilters.budgetMax);

          if (Number.isFinite(maximumBudget) && Number(property.price || 0) > maximumBudget) {
            return false;
          }
        }

        if (debouncedFilters.distanceKm !== "all") {
          const maxDistance = Number(debouncedFilters.distanceKm);

          if (property.distanceFromReferenceKm == null || property.distanceFromReferenceKm > maxDistance) {
            return false;
          }
        }

        return true;
      })
      .sort((left, right) => {
        if (left.distanceFromReferenceKm == null && right.distanceFromReferenceKm == null) {
          return 0;
        }

        if (left.distanceFromReferenceKm == null) {
          return 1;
        }

        if (right.distanceFromReferenceKm == null) {
          return -1;
        }

        return left.distanceFromReferenceKm - right.distanceFromReferenceKm;
      });
  }, [debouncedFilters, items, referenceCenter]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  const selectedProperty =
    filteredItems.find((property) => property.id === selectedMarkerId) ||
    filteredItems.find((property) => property.coordinates) ||
    null;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ITEMS);
  }, [debouncedFilters]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedMarkerId("");
      return;
    }

    if (!filteredItems.find((property) => property.id === selectedMarkerId)) {
      setSelectedMarkerId(filteredItems[0].id);
    }
  }, [filteredItems, selectedMarkerId]);

  const handleFilterChange = (field, option) => {
    setRawFilters((current) => ({
      ...current,
      [field]: option?.value || "all"
    }));
  };

  const handleOpenConversation = async (property) => {
    const participantId = property.agentId || property.ownerUserId;

    if (!participantId || !user) {
      return;
    }

    const conversation = await createConversation({
      participantId,
      propertyId: property.id
    });

    navigate(`/messages?conversationId=${conversation.id}`);
  };

  const handleOpenOwnerConversation = async (property) => {
    if (!property.ownerUserId || !user) {
      return;
    }

    const conversation = await createConversation({
      participantId: property.ownerUserId,
      propertyId: property.id
    });

    navigate(`/messages?conversationId=${conversation.id}`);
  };

  const handleOpenDetail = (property) => {
    if (!property?.slug && !property?.id) {
      return;
    }

    setDetailModalIdentifier(property.slug || property.id);
  };

  if (propertyPublicationsQuery.isLoading) {
    return <PublicationsLoading />;
  }

  if (propertyPublicationsQuery.isError) {
    return (
      <section className="space-y-8">
        <SectionTitle
          eyebrow={t("private", "publications.eyebrow", "Publications")}
          title={t("private", "publications.title", "Publication des biens")}
          description={t("private", "publications.errorDescription", "Le flux de publications n'a pas pu etre charge.")}
        />
        <Card>
          <p className="text-sm text-red-300">{t("private", "publications.error", "Une erreur est survenue lors du chargement des publications.")}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow={t("private", "publications.eyebrow", "Publications")}
        title={t("private", "publications.title", "Publication des biens")}
        description={t("private", "publications.description", "Explorez des biens publies comme un catalogue moderne: filtres rapides, carte interactive et actions immediates.")}
      />

      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-0">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/80">{t("private", "publications.searchEyebrow", "Recherche intelligente")}</p>
              <h2 className="text-2xl font-semibold text-white">{t("private", "publications.searchTitle", "Liste ou carte, avec les memes biens et les memes filtres")}</h2>
              <p className="max-w-3xl text-sm leading-6 text-stone-300">
                {t("private", "publications.searchDescription", "Le bien reste une publication simple. L'agent et l'agence deviennent des filtres d'analyse, pas l'axe principal d'affichage.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SettingsTabButton active={activeTab === "list"} label={t("private", "publications.tabs.list", "Liste")} onClick={() => setActiveTab("list")} />
              <SettingsTabButton active={activeTab === "map"} label={t("private", "publications.tabs.map", "Carte")} onClick={() => setActiveTab("map")} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-white/10 px-5 py-5 sm:grid-cols-2 xl:grid-cols-6 sm:px-6">
          <BaseListBox
            label={t("private", "publications.filters.distance", "Distance")}
            options={distanceOptions}
            value={distanceOptions.find((option) => option.value === rawFilters.distanceKm) || distanceOptions[0]}
            onChange={(option) => handleFilterChange("distanceKm", option)}
          />
          <BaseListBox
            label={t("private", "publications.filters.agent", "Agent")}
            options={agentOptions}
            value={agentOptions.find((option) => option.value === rawFilters.agentId) || agentOptions[0]}
            onChange={(option) => handleFilterChange("agentId", option)}
          />
          <BaseListBox
            label={t("private", "publications.filters.agency", "Agence")}
            options={agencyOptions}
            value={agencyOptions.find((option) => option.value === rawFilters.agencyId) || agencyOptions[0]}
            onChange={(option) => handleFilterChange("agencyId", option)}
          />
          <BaseListBox
            label={t("private", "publications.filters.purpose", "Objectif")}
            options={purposeOptions}
            value={purposeOptions.find((option) => option.value === rawFilters.purpose) || purposeOptions[0]}
            onChange={(option) => handleFilterChange("purpose", option)}
          />
          <BaseListBox
            label={t("private", "publications.filters.type", "Type de bien")}
            options={typeOptions}
            value={typeOptions.find((option) => option.value === rawFilters.type) || typeOptions[0]}
            onChange={(option) => handleFilterChange("type", option)}
          />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-200">{t("private", "publications.filters.budgetMax", "Budget max")}</span>
            <input
              type="number"
              min="0"
              value={rawFilters.budgetMax}
              onChange={(event) =>
                setRawFilters((current) => ({
                  ...current,
                  budgetMax: event.target.value
                }))
              }
              placeholder="250000"
              className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-white/5 text-stone-200">{filteredItems.length} {t("private", "publications.results.found", "biens trouves")}</Badge>
            <Badge className="border-white/10 bg-white/5 text-stone-200">
              {t("private", "publications.results.reference", "Reference distance")}: {referenceCenter.lat.toFixed(4)}, {referenceCenter.lng.toFixed(4)}
            </Badge>
            {user?.role === "user" && hasAppliedUserDefaultFilters ? (
              <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">
                Matching intelligent applique sur Publications
              </Badge>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRawFilters({
                distanceKm: "all",
                agentId: "all",
                agencyId: "all",
                purpose: "all",
                type: "all",
                budgetMax: ""
              });
            }}
          >
            {t("private", "publications.filters.reset", "Reinitialiser les filtres")}
          </Button>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          {activeTab === "map" ? (
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-stone-950/70">
                {!googleMapsApiKey ? (
                  <div className="flex h-[540px] items-center justify-center px-6 text-center text-sm text-amber-100/80">
                    {t("private", "publications.map.missingKey", "Ajoutez `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` pour activer la carte.")}
                  </div>
                ) : loadError ? (
                  <div className="flex h-[540px] items-center justify-center px-6 text-center text-sm text-red-200">
                    {t("private", "publications.map.error", "Impossible de charger Google Maps pour le moment.")}
                  </div>
                ) : !isMapsLoaded ? (
                  <div className="flex h-[540px] items-center justify-center px-6 text-center text-sm text-stone-300">
                    {t("private", "publications.map.loading", "Chargement de la carte Google...")}
                  </div>
                ) : (
                  <GoogleMap
                    mapContainerClassName="h-[540px] w-full"
                    center={selectedProperty?.coordinates || referenceCenter}
                    zoom={selectedProperty?.coordinates ? 14 : DEFAULT_MAP_ZOOM}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      clickableIcons: false
                    }}
                  >
                    {filteredItems
                      .filter((property) => property.coordinates)
                      .map((property) => (
                        <MarkerF
                          key={property.id}
                          position={property.coordinates}
                          onClick={() => setSelectedMarkerId(property.id)}
                        />
                      ))}
                  </GoogleMap>
                )}
              </div>

              <div className="space-y-4">
                {selectedProperty ? (
                  <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-stone-950/70">
                        {selectedProperty.coverImage ? (
                          <img
                            src={resolveAssetUrl(selectedProperty.coverImage)}
                            alt={selectedProperty.title}
                            className="h-48 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-48 items-end bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_32%),linear-gradient(135deg,rgba(41,37,36,1),rgba(28,25,23,0.92),rgba(12,10,9,1))] p-6">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">{t("private", "publications.map.preview", "Map Preview")}</p>
                              <p className="mt-2 text-lg font-semibold text-white">{selectedProperty.title}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getStatusBadgeClassName(selectedProperty)}>{selectedProperty.status}</Badge>
                          <Badge>{selectedProperty.purpose}</Badge>
                          <Badge className="border-white/10 bg-white/5 text-stone-200">{selectedProperty.type}</Badge>
                        </div>
                        <h3 className="text-2xl font-semibold text-white">{selectedProperty.title}</h3>
                        <p className="text-sm text-stone-300">{selectedProperty.address}</p>
                        <p className="text-lg font-semibold text-brand-100">{formatPrice(selectedProperty.price, selectedProperty.currency)}</p>
                        <p className="text-sm leading-6 text-stone-300">{selectedProperty.description}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("private", "publications.labels.agent", "Agent")}</p>
                            <p className="mt-2 text-sm text-white">{selectedProperty.agentName || t("private", "publications.labels.notAssigned", "Non attribue")}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("private", "publications.labels.agency", "Agence")}</p>
                            <p className="mt-2 text-sm text-white">{selectedProperty.agencyName || t("private", "publications.labels.noAgency", "Aucune agence")}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button type="button" onClick={() => handleOpenDetail(selectedProperty)}>
                            {t("private", "publications.actions.viewDetail", "Voir detail")}
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => handleOpenConversation(selectedProperty)}>
                            {t("private", "publications.actions.discuss", "Discuter")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <p className="text-sm text-stone-300">{t("private", "publications.map.empty", "Aucun bien geolocalise ne correspond aux filtres actuels.")}</p>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {visibleItems.map((property) => (
                <PublicationCard
                  key={property.id}
                  property={property}
                  user={user}
                  favoriteMutation={favoriteMutation}
                  reservationMutation={reservationMutation}
                  onDiscuss={handleOpenConversation}
                  onOpenOwnerConversation={handleOpenOwnerConversation}
                  onOpenDetail={handleOpenDetail}
                  t={t}
                />
              ))}

              {!filteredItems.length ? (
                <Card>
                  <p className="text-sm text-stone-300">{t("private", "publications.empty", "Aucun bien ne correspond aux filtres selectionnes.")}</p>
                </Card>
              ) : null}

              {visibleCount < filteredItems.length ? (
                <div className="flex justify-center">
                  <Button type="button" variant="secondary" onClick={() => setVisibleCount((current) => current + INITIAL_VISIBLE_ITEMS)}>
                    {t("private", "publications.actions.showMore", "Afficher plus")}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      <ModalViewDetail
        open={Boolean(detailModalIdentifier)}
        propertyIdentifier={detailModalIdentifier}
        onClose={() => setDetailModalIdentifier("")}
      />
    </section>
  );
};

export default PublicationsPage;
