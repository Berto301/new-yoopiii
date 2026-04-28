export const SMART_MATCHING_PROPERTY_TYPE_OPTIONS = [
  { label: "Maison", value: "house" },
  { label: "Terrain", value: "land" },
  { label: "Appartement", value: "apartment" },
  { label: "Commerce", value: "commercial" },
  { label: "Bureau", value: "office" },
  { label: "Entrepot", value: "warehouse" }
];

export const SMART_MATCHING_RADIUS_OPTIONS = [
  { label: "1 km", value: 1 },
  { label: "5 km", value: 5 },
  { label: "100 km", value: 100 }
];

export const SMART_MATCHING_PURPOSE_OPTIONS = [
  { label: "Vente", value: "sale" },
  { label: "Location", value: "rent" }
];

export const SMART_MATCHING_SCORE_OPTIONS = [
  { label: "Tous les scores", value: 0 },
  { label: "50% et +", value: 50 },
  { label: "70% et +", value: 70 },
  { label: "85% et +", value: 85 }
];

export const DEFAULT_SMART_MATCHING = {
  enabled: false,
  budgetReal: "",
  purpose: "",
  propertyTypes: [],
  location: {
    enabled: false,
    lat: null,
    lng: null,
    label: ""
  },
  searchRadiusKm: 5,
  criteria: {
    version: 1,
    custom: {}
  }
};
