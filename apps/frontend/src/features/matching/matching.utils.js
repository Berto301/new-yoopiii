import { DEFAULT_SMART_MATCHING, SMART_MATCHING_RADIUS_OPTIONS, SMART_MATCHING_PROPERTY_TYPE_OPTIONS, SMART_MATCHING_PURPOSE_OPTIONS } from "./matching.constants.js";

export const computeDistanceInKm = (from, to) => {
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

const coerceNumberOrEmpty = (value) => {
  if (value === "" || value == null) {
    return "";
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : "";
};

export const normalizeSmartMatchingPreferences = (value) => {
  const source = value || {};
  const propertyTypes = Array.isArray(source.propertyTypes)
    ? source.propertyTypes
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];
  const allowedRadii = new Set(SMART_MATCHING_RADIUS_OPTIONS.map((option) => option.value));
  const allowedPurposes = new Set(SMART_MATCHING_PURPOSE_OPTIONS.map((option) => option.value));
  const nextRadius = Number(source.searchRadiusKm);

  return {
    enabled: Boolean(source.enabled),
    budgetReal: coerceNumberOrEmpty(source.budgetReal),
    purpose: allowedPurposes.has(source.purpose) ? source.purpose : DEFAULT_SMART_MATCHING.purpose,
    propertyTypes,
    location: {
      enabled: Boolean(source.location?.enabled),
      lat: Number.isFinite(Number(source.location?.lat)) ? Number(source.location.lat) : null,
      lng: Number.isFinite(Number(source.location?.lng)) ? Number(source.location.lng) : null,
      label: typeof source.location?.label === "string" ? source.location.label : ""
    },
    searchRadiusKm: allowedRadii.has(nextRadius) ? nextRadius : DEFAULT_SMART_MATCHING.searchRadiusKm,
    criteria: {
      version: Number(source.criteria?.version) || DEFAULT_SMART_MATCHING.criteria.version,
      custom: source.criteria?.custom && typeof source.criteria.custom === "object" ? source.criteria.custom : {}
    }
  };
};

export const buildSmartMatchingPayload = (values) => {
  const matching = normalizeSmartMatchingPreferences(values);

  return {
    ...matching,
    budgetReal: matching.budgetReal === "" ? null : Number(matching.budgetReal),
    location: {
      ...matching.location,
      lat: matching.location.enabled ? matching.location.lat : null,
      lng: matching.location.enabled ? matching.location.lng : null,
      label: matching.location.enabled ? matching.location.label : ""
    }
  };
};

export const getSmartMatchingPropertyTypeOptions = (values = []) =>
  SMART_MATCHING_PROPERTY_TYPE_OPTIONS.filter((option) => values.includes(option.value));

export const formatSmartMatchingSummary = (matching) => {
  const normalized = normalizeSmartMatchingPreferences(matching);
  const purposeLabel = SMART_MATCHING_PURPOSE_OPTIONS.find((option) => option.value === normalized.purpose)?.label || "Tous objectifs";

  return {
    enabled: normalized.enabled,
    budgetLabel: normalized.budgetReal !== "" ? `${normalized.budgetReal}` : "Non defini",
    purposeLabel,
    propertyTypeLabels: getSmartMatchingPropertyTypeOptions(normalized.propertyTypes).map((option) => option.label),
    radiusLabel: `${normalized.searchRadiusKm} km`,
    hasLocation: Boolean(normalized.location.enabled && normalized.location.lat != null && normalized.location.lng != null)
  };
};

const getPropertyCoordinates = (property) => {
  const lat = Number(property?.mapMarker?.lat ?? property?.location?.coordinates?.[1] ?? property?.location?.lat);
  const lng = Number(property?.mapMarker?.lng ?? property?.location?.coordinates?.[0] ?? property?.location?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
};

const getUserCoordinates = (matching) => {
  if (!matching.location.enabled) {
    return null;
  }

  if (!Number.isFinite(Number(matching.location.lat)) || !Number.isFinite(Number(matching.location.lng))) {
    return null;
  }

  return {
    lat: Number(matching.location.lat),
    lng: Number(matching.location.lng)
  };
};

export const computeUserPropertyMatch = ({ user, property }) => {
  const matching = normalizeSmartMatchingPreferences(
    user?.preferences?.smartMatching || user?.preferences?.intelligentMatching || user?.smartMatching
  );

  if (!matching.enabled) {
    return null;
  }

  const price = Number(property?.price || 0);
  const budget = matching.budgetReal === "" ? null : Number(matching.budgetReal);
  const purposeMatch = !matching.purpose || matching.purpose === property?.purpose;
  const propertyTypeMatch = !matching.propertyTypes.length || matching.propertyTypes.includes(property?.type);
  const budgetMatch = budget == null || price <= budget;
  const propertyCoordinates = getPropertyCoordinates(property);
  const userCoordinates = getUserCoordinates(matching);
  const distanceKm = computeDistanceInKm(userCoordinates, propertyCoordinates);
  const locationMatch = !userCoordinates || distanceKm == null ? !userCoordinates : distanceKm <= matching.searchRadiusKm;

  const signalWeights = [
    { key: "purpose", matched: purposeMatch, weight: 20 },
    { key: "type", matched: propertyTypeMatch, weight: 25 },
    { key: "budget", matched: budgetMatch, weight: 30 },
    { key: "location", matched: locationMatch, weight: 25 }
  ];
  const score = signalWeights.reduce((total, item) => total + (item.matched ? item.weight : 0), 0);

  return {
    user,
    property,
    matching,
    score,
    isStrongMatch: score >= 70,
    checks: {
      purpose: purposeMatch,
      type: propertyTypeMatch,
      budget: budgetMatch,
      location: locationMatch
    },
    distanceKm,
    reasons: [
      purposeMatch ? "Objectif compatible" : "Objectif different",
      propertyTypeMatch ? "Type compatible" : "Type hors criteres",
      budgetMatch ? "Budget compatible" : "Budget depasse",
      userCoordinates ? (locationMatch ? "Zone compatible" : "Hors rayon") : "Sans filtre de localisation"
    ]
  };
};

export const buildDefaultPublicationFilters = (user) => {
  const matching = normalizeSmartMatchingPreferences(
    user?.preferences?.smartMatching || user?.preferences?.intelligentMatching
  );

  if (user?.role !== "user" || !matching.enabled) {
    return {
      purpose: "all",
      type: "all",
      distanceKm: "all",
      budgetMax: ""
    };
  }

  return {
    purpose: matching.purpose || "all",
    type: matching.propertyTypes[0] || "all",
    distanceKm: matching.location.enabled ? String(matching.searchRadiusKm) : "all",
    budgetMax: matching.budgetReal === "" ? "" : String(matching.budgetReal)
  };
};
