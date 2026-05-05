import { useMemo, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { Link, useNavigate } from "react-router-dom";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { resolveAvatarUrl } from "../../components/profile/avatar.utils.js";
import { Card } from "../../components/ui/Card.jsx";
import { useLandingOverview } from "../../features/landing/hooks/useLandingOverview.js";
import { useSharedGoogleMapsLoader } from "../../lib/utils/google-maps.js";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";

const HERO_IMAGE = "/assets/hero-bg.jpg";
const DEFAULT_MAP_CENTER = { lat: -19.872006, lng: 47.03961 };
const PROPERTY_FILTER_OPTIONS = [
  { value: "", labelKey: "filters.type", fallback: "Type" },
  { value: "apartment", labelKey: "propertyTypes.apartment", fallback: "Appartement" },
  { value: "house", labelKey: "propertyTypes.house", fallback: "Maison / Villa" },
  { value: "commercial", labelKey: "propertyTypes.commercial", fallback: "Commercial" },
  { value: "office", labelKey: "propertyTypes.office", fallback: "Bureau" },
  { value: "warehouse", labelKey: "propertyTypes.warehouse", fallback: "Entrepot" },
  { value: "land", labelKey: "propertyTypes.land", fallback: "Terrain" }
];
const PROPERTY_TYPES = [
  { id: "appartement", labelKey: "propertyTypes.apartment", fallback: "Appartement", category: "property", keywords: ["appartement", "apartment"] },
  { id: "villa", labelKey: "propertyTypes.villa", fallback: "Villa", category: "property", keywords: ["villa"] },
  { id: "building", labelKey: "propertyTypes.building", fallback: "Immeuble", category: "property", keywords: ["building", "immeuble"] },
  { id: "shop", labelKey: "propertyTypes.shop", fallback: "Boutique", category: "property", keywords: ["shop", "boutique", "commerce", "commercial local"] },
  { id: "garage", labelKey: "propertyTypes.garage", fallback: "Garage", category: "property", keywords: ["garage"] },
  { id: "terrain-residentiel", labelKey: "propertyTypes.residentialLand", fallback: "Terrain residentiel", category: "terrain", keywords: ["terrain residentiel", "residential land"] },
  { id: "terrain-commercial", labelKey: "propertyTypes.commercialLand", fallback: "Terrain commercial", category: "terrain", keywords: ["terrain commercial", "commercial land"] },
  { id: "terrain-agricole", labelKey: "propertyTypes.agriculturalLand", fallback: "Terrain agricole", category: "terrain", keywords: ["terrain agricole", "farm land", "agricultural land"] },
  { id: "lotissement", labelKey: "propertyTypes.subdivision", fallback: "Lotissement", category: "terrain", keywords: ["lotissement", "lot"] },
  { id: "parcelle-angle", labelKey: "propertyTypes.cornerPlot", fallback: "Parcelle angle", category: "terrain", keywords: ["parcelle angle", "corner lot"] },
  { id: "terrain-investissement", labelKey: "propertyTypes.investmentLand", fallback: "Terrain d'investissement", category: "terrain", keywords: ["terrain d'investissement", "terrain investissement", "investment land"] }
];

const formatPrice = (value, currency = "USD") => formatMoney(value, currency);

const buildInitials = (name) =>
  String(name || "YP")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const normalizeTypeLabel = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getTypeCounts = (properties = []) => {
  const counts = Object.fromEntries(PROPERTY_TYPES.map((item) => [item.id, 0]));

  properties.forEach((property) => {
    const normalizedType = normalizeTypeLabel(property.type);
    const matchedType = PROPERTY_TYPES.find((item) => item.keywords.some((keyword) => normalizeTypeLabel(keyword) === normalizedType));

    if (matchedType) {
      counts[matchedType.id] += 1;
    }
  });

  return counts;
};

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
    <path d="M12 3.8 3.5 10v10.2h6.2v-6h4.6v6h6.2V10L12 3.8Zm6.4 14.8h-2.2v-6H7.8v6H5.6v-7.8l6.4-4.7 6.4 4.7v7.8Z" fill="currentColor" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path d="M12 2.8a6.1 6.1 0 0 0-6.1 6.1c0 4.2 5.1 10.7 5.4 11l.7.9.7-.9c.3-.3 5.4-6.8 5.4-11A6.1 6.1 0 0 0 12 2.8Zm0 8.6a2.5 2.5 0 1 1 0-5a2.5 2.5 0 0 1 0 5Z" fill="currentColor" />
  </svg>
);

const BedIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path d="M5 7.5a2 2 0 1 1 4 0v1h6V7.2a1.9 1.9 0 1 1 3.8 0V14H4V7.5h1Zm-1 8.1h16v2H4v-2Z" fill="currentColor" />
  </svg>
);

const BathIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path d="M7 6.5a3.5 3.5 0 0 1 7 0V8h2.2v2H4.5V8H12V6.5a1.5 1.5 0 0 0-3 0V8H7V6.5Zm-2.5 5h14.7c0 3.8-2.3 6.2-5.9 6.2H10.4c-3.6 0-5.9-2.4-5.9-6.2Z" fill="currentColor" />
  </svg>
);

const AreaIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
    <path d="M4 4h5v2H6v3H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z" fill="currentColor" />
  </svg>
);

const SectionHeading = ({ eyebrow, title, description, align = "left" }) => (
  <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-bold leading-tight text-stone-950 md:text-5xl">{title}</h2>
    <p className="mt-4 text-sm leading-7 text-stone-500 md:text-base">{description}</p>
  </div>
);

const LandingSkeleton = () => (
  <section className="mx-auto max-w-7xl px-6 py-14">
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        <div className="h-5 w-32 animate-pulse rounded-full bg-stone-200" />
        <div className="h-16 w-5/6 animate-pulse rounded-[1.5rem] bg-stone-200" />
        <div className="h-5 w-4/5 animate-pulse rounded-full bg-stone-200" />
        <div className="h-14 w-40 animate-pulse rounded-full bg-stone-200" />
      </div>
      <div className="h-[420px] animate-pulse rounded-[2rem] bg-stone-200" />
    </div>
  </section>
);

const HeroSearchBar = ({ navigate, t }) => {
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    const searchParams = new URLSearchParams();

    if (keyword.trim()) {
      searchParams.set("search", keyword.trim());
    }

    if (type) {
      searchParams.set("type", type);
    }

    if (location.trim()) {
      searchParams.set("location", location.trim());
    }

    const nextPath = searchParams.toString() ? `/properties?${searchParams.toString()}` : "/properties";
    navigate(nextPath);
  };

  return (
    <div className="rounded-[2rem] bg-brand-500 p-4 shadow-[0_18px_40px_rgba(157,93,67,0.24)]">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t("landing", "hero.keywords", "Mots-cles")}
          className="h-12 rounded-xl border border-white/50 bg-white px-4 text-sm text-stone-950 outline-none transition focus:border-stone-950/20"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-12 rounded-xl border border-white/50 bg-white px-4 text-sm text-stone-950 outline-none transition focus:border-stone-950/20"
        >
          {PROPERTY_FILTER_OPTIONS.map((item) => (
            <option key={item.value || "all"} value={item.value}>{t("landing", item.labelKey, item.fallback)}</option>
          ))}
        </select>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder={t("landing", "hero.location", "Localisation")}
          className="h-12 rounded-xl border border-white/50 bg-white px-4 text-sm text-stone-950 outline-none transition focus:border-stone-950/20"
        />
        <Button type="button" className="h-12 rounded-xl bg-[var(--foreground)] px-6 text-[var(--background)] hover:opacity-90" onClick={handleSearch}>
          {t("landing", "hero.search", "Rechercher")}
        </Button>
      </div>
    </div>
  );
};

const TypeCard = ({ label, countLabel }) => (
  <Card className="rounded-[1.8rem] border-[rgba(157,93,67,0.12)] bg-white p-8 text-center shadow-[0_16px_35px_rgba(45,30,23,0.08)]">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand-300/50 text-brand-500">
      <HomeIcon />
    </div>
    <h3 className="mt-5 text-xl font-semibold text-stone-950">{label}</h3>
    <p className="mt-2 text-sm text-brand-500">{countLabel}</p>
  </Card>
);

const PropertyCard = ({ property, onView, t }) => (
  <article className="overflow-hidden rounded-[1.75rem] border border-[rgba(157,93,67,0.12)] bg-white shadow-[0_18px_40px_rgba(45,30,23,0.1)] transition hover:-translate-y-1">
    <div className="relative h-56 overflow-hidden">
      <img src={property.coverImage ? resolveAssetUrl(property.coverImage) : HERO_IMAGE} alt={property.title} className="h-full w-full object-cover" />
      <span className="absolute left-4 top-4 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white">{property.purpose || t("landing", "propertyCard.purposeFallback", "Publie")}</span>
    </div>
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#f4e1d7] px-3 py-1 text-xs font-medium text-brand-500">{property.type || t("landing", "propertyCard.typeFallback", "Bien")}</span>
        <span className="text-sm font-medium text-brand-500">{formatPrice(property.price, property.currency)}</span>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-stone-950">{property.title}</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
          <PinIcon />
          <span>{property.address || t("landing", "propertyCard.addressFallback", "Adresse non renseignee")}</span>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-stone-200 pt-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><BedIcon /> {property.bedrooms || 3} {t("landing", "propertyCard.beds", "chambres")}</span>
        <span className="flex items-center gap-1.5"><BathIcon /> {property.bathrooms || 3} {t("landing", "propertyCard.baths", "bains")}</span>
        <span className="flex items-center gap-1.5"><AreaIcon /> {property.area || 1000} m2</span>
      </div>
      <Button type="button" className="w-full bg-brand-500 text-white hover:bg-brand-700" onClick={onView}>
        {t("landing", "published.viewDetail", "Voir detail")}
      </Button>
    </div>
  </article>
);

const AgentCard = ({ agent, t }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarSrc = imageFailed ? "" : resolveAvatarUrl(agent?.avatar, "");

  return (
    <Card className="overflow-hidden rounded-[1.6rem] border-[rgba(157,93,67,0.12)] bg-white p-0 shadow-[0_12px_30px_rgba(45,30,23,0.08)]">
      <div className="aspect-[0.95] bg-[#f4e6df]">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={agent.fullName}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl font-bold text-brand-500">{buildInitials(agent.fullName)}</div>
        )}
      </div>
      <div className="space-y-2 p-4 text-center">
        <h3 className="text-lg font-semibold text-stone-950">{agent.fullName}</h3>
        <p className="text-sm text-stone-500">{agent.agencyName || t("landing", "agentsSection.agentFallback", "Agent Yopii")}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-brand-500">{agent.managedPropertiesCount || 0} {t("landing", "agentsSection.managedProperties", "biens geres")}</p>
      </div>
    </Card>
  );
};

const PublishedMapPanel = ({ properties, navigate, t }) => {
  const { googleMapsApiKey, isLoaded: isMapsLoaded, loadError } = useSharedGoogleMapsLoader();
  const mapItems = useMemo(
    () => (properties || []).filter((property) => Number.isFinite(property?.mapMarker?.lat) && Number.isFinite(property?.mapMarker?.lng)),
    [properties]
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState(mapItems[0]?.id || "");
  const selectedProperty = mapItems.find((property) => property.id === selectedPropertyId) || mapItems[0] || null;
  const mapCenter = selectedProperty?.mapMarker || mapItems[0]?.mapMarker || DEFAULT_MAP_CENTER;

  return (
    <Card className="rounded-[2rem] border-[rgba(157,93,67,0.12)] bg-white p-0 shadow-[0_20px_45px_rgba(45,30,23,0.1)]">
      <div className="border-b border-stone-200 px-6 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">{t("landing", "published.mapTitle", "Carte interactive")}</p>
        <h3 className="mt-2 text-2xl font-bold text-stone-950">{t("landing", "published.mapHeading", "Les biens se lisent aussi par emplacement.")}</h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[#f7f9f8]">
          {!googleMapsApiKey ? (
            <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-stone-500">
              {t("landing", "published.mapMissingKey", "Ajoutez `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` pour activer la carte.")}
            </div>
          ) : loadError ? (
            <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-red-400">
              {t("landing", "published.mapError", "Impossible de charger Google Maps pour le moment.")}
            </div>
          ) : !isMapsLoaded ? (
            <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-stone-500">
              {t("landing", "published.mapLoading", "Chargement de la carte Google...")}
            </div>
          ) : (
            <GoogleMap
              mapContainerClassName="h-[360px] w-full"
              center={mapCenter}
              zoom={selectedProperty?.mapMarker ? 14 : 12}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                clickableIcons: false
              }}
            >
              {mapItems.map((property) => (
                <MarkerF key={property.id} position={property.mapMarker} onClick={() => setSelectedPropertyId(property.id)} />
              ))}
            </GoogleMap>
          )}
        </div>

        {selectedProperty ? (
          <div className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-[#fdf8f5] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-stone-950">{selectedProperty.title}</p>
                <p className="mt-1 text-sm text-stone-500">{selectedProperty.address || t("landing", "published.addressMissing", "Adresse non renseignee")}</p>
              </div>
              <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white">{selectedProperty.type || t("landing", "propertyCard.typeFallback", "Bien")}</span>
            </div>
            <p className="text-lg font-semibold text-brand-500">{formatPrice(selectedProperty.price, selectedProperty.currency)}</p>
            <p className="text-sm leading-7 text-stone-500">{selectedProperty.description || t("landing", "published.descriptionMissing", "Description indisponible.")}</p>
            <div className="flex flex-wrap gap-2">
              {mapItems.slice(0, 3).map((property) => (
                <button
                  key={property.id}
                  type="button"
                  className={`rounded-full border px-3 py-2 text-xs transition ${property.id === selectedProperty.id ? "border-brand-500 bg-brand-500 text-white" : "border-brand-300/50 text-brand-500 hover:bg-brand-500 hover:text-white"}`}
                  onClick={() => setSelectedPropertyId(property.id)}
                >
                  {property.title}
                </button>
              ))}
            </div>
            <Button type="button" className="bg-brand-500 text-white hover:bg-brand-700" onClick={() => navigate(`/properties/${selectedProperty.slug || selectedProperty.id}`)}>
              {t("landing", "published.viewDetail", "Voir detail")}
            </Button>
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-stone-200 bg-[#fdf8f5] p-5 text-sm text-stone-500">
            {t("landing", "published.empty", "Aucun bien geolocalise n'est disponible pour le moment.")}
          </div>
        )}
      </div>
    </Card>
  );
};

const TestimonialBlock = ({ featuredAgency, summary, t }) => (
  <section className="grid gap-8 lg:grid-cols-[0.42fr_0.58fr] lg:items-center">
    <div className="mx-auto h-40 w-40 overflow-hidden rounded-full border-4 border-brand-500 bg-[#f4e1d7] shadow-[0_16px_35px_rgba(45,30,23,0.12)]">
      {featuredAgency?.logo ? (
        <img src={resolveAssetUrl(featuredAgency.logo)} alt={featuredAgency.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-4xl font-bold text-brand-500">{buildInitials(featuredAgency?.name)}</div>
      )}
    </div>
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">{t("landing", "testimonial.eyebrow", "Ils nous font confiance")}</p>
      <h2 className="text-3xl font-bold text-stone-950 md:text-4xl">{featuredAgency?.name || "Yopii"}</h2>
      <p className="max-w-2xl text-base leading-8 text-stone-500">
        {t("landing", "testimonial.description", "Yopii connecte vitrine publique, biens publies, agences actives et agents disponibles dans une experience immobiliere claire, moderne et rassurante.")}
      </p>
      <div className="flex flex-wrap gap-3">
        <span className="rounded-full bg-[#f4e1d7] px-4 py-2 text-sm font-medium text-brand-500">{summary.propertiesCount || 0} {t("landing", "hero.metrics.properties", "Biens")}</span>
        <span className="rounded-full bg-[#f4e1d7] px-4 py-2 text-sm font-medium text-brand-500">{summary.agenciesCount || 0} {t("landing", "hero.metrics.agencies", "Agences")}</span>
        <span className="rounded-full bg-[#f4e1d7] px-4 py-2 text-sm font-medium text-brand-500">{summary.agentsCount || 0} {t("landing", "hero.metrics.agents", "Agents")}</span>
      </div>
    </div>
  </section>
);

export const LandingPage = () => {
  const navigate = useNavigate();
  const { t, preferences } = useUserPreferences();
  const { currentUser, landingQuery } = useLandingOverview();
  const [activeTypeTab, setActiveTypeTab] = useState("property");
  const isLightTheme = preferences?.theme === "light";
  const activeTabColor = isLightTheme ? "#9d5d43" : "#c98d70";
  const inactiveTabColor = isLightTheme ? "#5c504d" : "#d7cdca";

  const landingData = landingQuery.data;
  const summary = landingData?.summary || {};
  const featuredAgency = (landingData?.agencies || [])[0] || null;
  const recentProperties = useMemo(() => (landingData?.recentProperties || []).slice(0, 6), [landingData?.recentProperties]);
  const mapProperties = useMemo(() => landingData?.propertyMap || [], [landingData?.propertyMap]);
  const featuredAgents = useMemo(() => (landingData?.agents || []).slice(0, 4), [landingData?.agents]);
  const typeCounts = useMemo(() => getTypeCounts(mapProperties), [mapProperties]);
  const typeItems = PROPERTY_TYPES.filter((item) => item.category === activeTypeTab);
  const aboutHighlights = [
    t("landing", "about.highlights.modernHome", "Habitats modernes"),
    t("landing", "about.highlights.affordablePrice", "Prix lisibles"),
    t("landing", "about.highlights.rightPapers", "Dossiers verifies"),
    t("landing", "about.highlights.verifiedAgents", "Agents verifies")
  ];

  if (landingQuery.isLoading) {
    return <LandingSkeleton />;
  }

  if (landingQuery.isError) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <Card className="rounded-[2rem] border-[rgba(157,93,67,0.12)] bg-white text-stone-600">
          <h1 className="text-3xl font-bold text-stone-950">{t("landing", "errors.title", "Landing indisponible")}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7">{t("landing", "errors.description", "Les donnees n'ont pas pu etre chargees pour le moment. Reessayez dans quelques instants.")}</p>
        </Card>
      </section>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* <div className="absolute left-0 top-[26rem] hidden h-[900px] w-48 bg-[radial-gradient(circle,rgba(157,93,67,0.12)_1px,transparent_1px)] [background-size:18px_18px] lg:block" />
      <div className="absolute right-0 top-[70rem] hidden h-[900px] w-48 bg-[radial-gradient(circle,rgba(157,93,67,0.12)_1px,transparent_1px)] [background-size:18px_18px] lg:block" /> */}

      <section className="mx-auto max-w-7xl px-6 pb-8 pt-12 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">{t("landing", "hero.badge", "Yopii Real Estate")}</p>
            <h1 className="max-w-2xl text-5xl font-bold leading-[1.04] text-stone-950 md:text-6xl">
              {t("landing", "hero.mockTitle", "Trouvez la maison ou le terrain ideal pour votre projet")}
            </h1>
            <p className="max-w-lg text-base leading-8 text-stone-500">
              {t("landing", "hero.mockDescription", "Une vitrine claire pour explorer, comparer et contacter les bons professionnels.")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button as={Link} to={currentUser ? "/properties" : "/login"} className="bg-brand-500 px-8 text-white hover:bg-brand-700">
                {currentUser?.role === "proprietaire" ? t("landing", "hero.openSpace", "Ouvrir mon espace") : t("landing", "hero.getStarted", "Commencer")}
              </Button>
              <Button as={Link} to="/properties" variant="secondary" className="border-brand-500/20 text-brand-500 hover:border-brand-500/40">
                {t("landing", "hero.explore", "Explorer les biens")}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(45,30,23,0.08)]">
                <p className="text-sm text-stone-500">{t("landing", "hero.metrics.properties", "Biens")}</p>
                <p className="mt-2 text-2xl font-bold text-stone-950">{summary.propertiesCount || 0}</p>
              </div>
              <div className="rounded-[1.4rem] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(45,30,23,0.08)]">
                <p className="text-sm text-stone-500">{t("landing", "hero.metrics.agencies", "Agences")}</p>
                <p className="mt-2 text-2xl font-bold text-stone-950">{summary.agenciesCount || 0}</p>
              </div>
              <div className="rounded-[1.4rem] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(45,30,23,0.08)]">
                <p className="text-sm text-stone-500">{t("landing", "published.eyebrow", "Publies")}</p>
                <p className="mt-2 text-2xl font-bold text-stone-950">{mapProperties.length}</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-12 hidden h-32 w-24 bg-brand-500 lg:block" />
            <div className="relative overflow-hidden rounded-[2.4rem] bg-white p-4 shadow-[0_24px_60px_rgba(45,30,23,0.12)]">
              <img src={HERO_IMAGE} alt="Maison hero Yopii" className="h-full w-full rounded-[2rem] object-cover" />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <HeroSearchBar navigate={navigate} t={t} />
        </div>
      </section>

      <section id="types" className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div
              className="flex flex-wrap items-end gap-6 border-b"
              style={{ borderColor: isLightTheme ? "rgba(157,93,67,0.18)" : "rgba(247,249,248,0.14)" }}
            >
              <button
                type="button"
                aria-pressed={activeTypeTab === "property"}
                className="-mb-px border-b-[3px] px-2 pb-4 pt-1 text-lg font-semibold transition md:text-2xl hover:border-brand-300/40 hover:text-brand-500"
                style={{
                  borderBottomColor: activeTypeTab === "property" ? activeTabColor : "transparent",
                  color: activeTypeTab === "property" ? activeTabColor : inactiveTabColor
                }}
                onClick={() => setActiveTypeTab("property")}
              >
                {t("landing", "types.property", "Types de biens")}
              </button>
              <button
                type="button"
                aria-pressed={activeTypeTab === "terrain"}
                className="-mb-px border-b-[3px] px-2 pb-4 pt-1 text-lg font-semibold transition md:text-2xl hover:border-brand-300/40 hover:text-brand-500"
                style={{
                  borderBottomColor: activeTypeTab === "terrain" ? activeTabColor : "transparent",
                  color: activeTypeTab === "terrain" ? activeTabColor : inactiveTabColor
                }}
                onClick={() => setActiveTypeTab("terrain")}
              >
                {t("landing", "types.terrain", "Types de terrains")}
              </button>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {typeItems.map((item) => (
                <TypeCard key={item.id} label={t("landing", item.labelKey, item.fallback)} countLabel={`${typeCounts[item.id] || 0} ${t("landing", "types.published", "publies")}`} />
              ))}
            </div>
          </div>

          <PublishedMapPanel properties={mapProperties} navigate={navigate} t={t} />
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative">
            <div className="absolute -left-3 top-10 hidden h-40 w-24 bg-brand-500 lg:block" />
            <div className="relative overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-[0_20px_45px_rgba(45,30,23,0.1)]">
              <img src={HERO_IMAGE} alt="Maison Yopii" className="h-full w-full rounded-[1.2rem] object-cover" />
            </div>
          </div>
          <div className="space-y-5">
            <SectionHeading
              eyebrow={t("landing", "about.eyebrow", "A propos")}
              title={t("landing", "about.title", "Le premier endroit pour trouver le bon bien ou terrain")}
              description={t("landing", "about.description", "Yopii met en avant les biens, les terrains, les agents et les agences dans une vitrine claire, premium et facile a parcourir depuis le web ou le mobile.")}
            />
            <ul className="grid gap-3 text-sm text-stone-600 md:grid-cols-2">
              {aboutHighlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-2"><span className="text-brand-500">OK</span> {highlight}</li>
              ))}
            </ul>
            <Button as={Link} to="/properties" className="bg-brand-500 text-white hover:bg-brand-700">{t("landing", "about.readMore", "En savoir plus")}</Button>
          </div>
        </div>
      </section>

      <section id="properties" className="mx-auto max-w-7xl px-6 py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={t("landing", "propertyList.eyebrow", "Liste des biens")}
            title={t("landing", "propertyList.title", "Choisissez vos biens favoris et ouvrez leur fiche detail.")}
            description={t("landing", "propertyList.description", "Une selection de biens recents publies sur Yopii avec leur visuel principal, leur localisation et leurs caracteristiques essentielles.")}
          />
          <div className="flex flex-wrap gap-3">
            <span className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white">{t("landing", "propertyList.filters.featured", "Selection")}</span>
            <span className="rounded-md border border-brand-300/60 px-4 py-2 text-sm text-stone-500">{t("landing", "propertyList.filters.sale", "Vente")}</span>
            <span className="rounded-md border border-brand-300/60 px-4 py-2 text-sm text-stone-500">{t("landing", "propertyList.filters.rent", "Location")}</span>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {recentProperties.map((property) => (
            <PropertyCard key={property.id} property={property} t={t} onView={() => navigate(`/properties/${property.slug || property.id}`)} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button as={Link} to="/properties" className="bg-brand-500 px-8 text-white hover:bg-brand-700">
            {t("landing", "propertyList.browseMore", "Voir plus de biens")}
          </Button>
        </div>
      </section>

      <section id="agents" className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeading
          eyebrow={t("landing", "agentsSection.eyebrow", "Agents biens et terrains")}
          title={t("landing", "agentsSection.title", "Contactez un agent depuis la plateforme.")}
          description={t("landing", "agentsSection.description", "Retrouvez quelques profils actifs relies a l'ecosysteme Yopii pour prolonger l'experience de la vitrine vers la prise de contact.")}
          align="center"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featuredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} t={t} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <TestimonialBlock featuredAgency={featuredAgency} summary={summary} t={t} />
      </section>
    </div>
  );
};

export default LandingPage;
