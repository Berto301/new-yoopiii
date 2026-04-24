import { useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { Link, useNavigate } from "react-router-dom";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";
import { useLandingOverview } from "../../features/landing/hooks/useLandingOverview.js";
import { ModalViewDetail } from "../../features/properties/components/ModalViewDetail.jsx";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";

const GOOGLE_MAPS_LIBRARIES = [];
const DEFAULT_MAP_CENTER = { lat: -19.872006, lng: 47.03961 };

const OWNER_STATUS_LABELS = {
  loue: "Loue",
  libre: "Disponible",
  en_travaux: "En travaux",
  Loue: "Loue",
  Libre: "Disponible",
  "En travaux": "En travaux"
};

const formatPrice = (value, currency = "AR") => formatMoney(value, currency);

const buildInitials = (name) =>
  String(name || "YP")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

const SectionHeading = ({ eyebrow, title, description }) => (
  <div className="max-w-3xl space-y-3">
    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#c9a66b]">{eyebrow}</p>
    <h2 className="font-serif text-3xl leading-tight text-white md:text-5xl">{title}</h2>
    <p className="text-sm leading-7 text-stone-300 md:text-base">{description}</p>
  </div>
);

const LandingSkeleton = () => (
  <section className="mx-auto max-w-7xl space-y-14 px-6 py-16">
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        <div className="space-y-5 animate-pulse">
          <div className="h-4 w-44 rounded-full bg-white/10" />
          <div className="h-14 w-4/5 rounded-[1rem] bg-white/10" />
          <div className="h-5 w-full rounded-full bg-white/10" />
          <div className="h-5 w-5/6 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="h-[420px] animate-pulse rounded-[2rem] border border-white/10 bg-white/10" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
      ))}
    </div>
  </section>
);

const EditorialHero = ({ summary, currentUser, featuredAgency, t }) => {
  const highlightMetrics = [
    { label: t("landing", "hero.metrics.properties", "Biens"), value: summary.propertiesCount || 0 },
    { label: t("landing", "hero.metrics.agencies", "Agences"), value: summary.agenciesCount || 0 },
    { label: t("landing", "hero.metrics.agents", "Agents"), value: summary.agentsCount || 0 },
    { label: t("landing", "hero.metrics.tenants", "Locataires"), value: summary.tenantsCount || 0 }
  ];

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(201,166,107,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(45,89,74,0.32),transparent_28%),linear-gradient(145deg,rgba(16,16,16,0.94),rgba(28,22,18,0.98))] px-6 py-8 md:px-8 lg:px-10 lg:py-10">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.03),transparent)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <div className="space-y-8">
          <div className="space-y-5">
            <Badge className="border-[#c9a66b]/30 bg-[#c9a66b]/10 text-[#f4dec1]">{t("landing", "hero.badge", "Real estate intelligence")}</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-serif text-4xl leading-[1.02] text-white sm:text-5xl lg:text-7xl">
                {t("landing", "hero.title", "Une vitrine immobiliere vivante, branchee sur les vraies donnees de Yopii.")}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-stone-300">
                {t("landing", "hero.description", "La landing met en scene l'ecosysteme Yopii en lecture seule avec une approche plus editoriale, plus premium et plus legere.")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button as={Link} to={currentUser?.role === "proprietaire" ? "/dashboard/owner" : "/login"} className="bg-[#c9a66b] text-stone-950 hover:bg-[#d9b983]">
              {currentUser?.role === "proprietaire" ? t("landing", "hero.openSpace", "Ouvrir mon espace") : t("landing", "hero.login", "Se connecter")}
            </Button>
            <Button as={Link} to="/#contact" variant="secondary">
              {t("landing", "hero.contact", "Nous contacter")}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {highlightMetrics.map((item) => (
              <div key={item.label} className="rounded-[1.6rem] border border-white/10 bg-black/20 px-5 py-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-stone-900 min-h-[360px] lg:min-h-[430px]">
            {featuredAgency?.logo ? (
              <img src={resolveAssetUrl(featuredAgency.logo)} alt={featuredAgency.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(145deg,rgba(201,166,107,0.28),rgba(20,20,20,0.96))]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.05),rgba(5,5,5,0.72))]" />
            {featuredAgency ? (
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-5 backdrop-blur-xl">
                  <Badge className="border-white/10 bg-white/10 text-white">{t("landing", "hero.featuredAgency", "Agence mise en avant")}</Badge>
                  <h3 className="mt-4 font-serif text-3xl text-white">{featuredAgency.name}</h3>
                  <p className="mt-2 text-sm text-stone-300">{t("landing", "hero.status", "Statut")}: {featuredAgency.status}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-white/10 bg-stone-950/45 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t("landing", "hero.properties", "Biens")}</p>
                      <p className="mt-2 text-2xl font-semibold text-[#f4dec1]">{featuredAgency.managedPropertiesCount || 0}</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-stone-950/45 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t("landing", "hero.agents", "Agents")}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{featuredAgency.activeAgentsCount || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

const StoryMetricCard = ({ label, value, description, accentClassName }) => (
  <div className={`rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 ${accentClassName}`}>
    <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{label}</p>
    <p className="mt-4 font-serif text-4xl text-white">{value}</p>
    <p className="mt-3 text-sm leading-7 text-stone-300">{description}</p>
  </div>
);

const PersonaCard = ({ avatar, name, subtitle, stats, badgeLabel, accent = "default" }) => (
  <article className={`rounded-[2rem] border border-white/10 p-5 ${accent === "gold" ? "bg-[linear-gradient(145deg,rgba(201,166,107,0.08),rgba(255,255,255,0.02))]" : "bg-white/[0.04]"}`}>
    <div className="flex items-start gap-4">
      {avatar ? (
        <img src={resolveAssetUrl(avatar)} alt={name} className="h-16 w-16 rounded-[1.4rem] object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/10 bg-black/25 text-sm font-semibold text-white">
          {buildInitials(name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {badgeLabel ? <Badge className="border-white/10 bg-white/5 text-stone-200">{badgeLabel}</Badge> : null}
        <h3 className="mt-3 text-xl font-semibold text-white">{name}</h3>
        <p className="mt-1 text-sm text-stone-400">{subtitle}</p>
      </div>
    </div>
    {stats?.length ? (
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {stats.map((item) => (
          <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-stone-950/45 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    ) : null}
  </article>
);

const PropertyStatusBadge = ({ value }) => {
  const className =
    value === "published"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : value === "reserved"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : value === "sold"
          ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
          : "border-white/10 bg-white/5 text-stone-200";

  return <Badge className={className}>{value}</Badge>;
};

const PublishedPropertiesShowcase = ({ properties, currentUser, onOpenDetail, onOpenPublicDetail, t }) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.GOOGLE_MAPS_API_KEY || "";
  const { isLoaded: isMapsLoaded, loadError } = useJsApiLoader({
    id: "property-google-maps-script",
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });
  const propertyItems = useMemo(() => (properties || []).slice(0, 3), [properties]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyItems[0]?.id || "");

  useEffect(() => {
    if (!propertyItems.length) {
      setSelectedPropertyId("");
      return;
    }

    if (!propertyItems.find((property) => property.id === selectedPropertyId)) {
      setSelectedPropertyId(propertyItems[0].id);
    }
  }, [propertyItems, selectedPropertyId]);

  const selectedProperty = propertyItems.find((property) => property.id === selectedPropertyId) || propertyItems[0] || null;
  const mapItems = propertyItems.filter(
    (property) => Number.isFinite(property?.mapMarker?.lat) && Number.isFinite(property?.mapMarker?.lng)
  );
  const mapCenter = selectedProperty?.mapMarker || mapItems[0]?.mapMarker || DEFAULT_MAP_CENTER;

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow={t("landing", "published.eyebrow", "Biens publies")}
        title={t("landing", "published.title", "Trois biens publies, lus comme une selection editoriale.")}
        description={t("landing", "published.description", "La landing affiche maintenant une courte liste de biens reellement publies, accompagnee d'une carte interactive pour situer instantanement chaque opportunite.")}
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {propertyItems.map((property) => {
            const isActive = property.id === selectedProperty?.id;

            return (
              <Card
                key={property.id}
                className={`overflow-hidden border-white/10 p-0 transition ${isActive ? "bg-[linear-gradient(145deg,rgba(201,166,107,0.12),rgba(255,255,255,0.03))]" : "bg-white/[0.04]"}`}
              >
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <div className="h-52 bg-stone-900 md:h-full">
                    {property.coverImage ? (
                      <img src={resolveAssetUrl(property.coverImage)} alt={property.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-end bg-[radial-gradient(circle_at_top_left,rgba(201,166,107,0.24),transparent_32%),linear-gradient(135deg,rgba(41,37,36,1),rgba(12,10,9,1))] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">{t("landing", "published.publication", "Publication")}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-semibold text-white">{property.title}</p>
                        <p className="mt-1 text-sm text-stone-400">{property.address || t("landing", "published.addressMissing", "Adresse non renseignee")}</p>
                      </div>
                      <PropertyStatusBadge value={property.status} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-white/10 bg-white/5 text-stone-200">{property.type}</Badge>
                      <Badge className="border-white/10 bg-white/5 text-stone-200">{property.purpose}</Badge>
                      <Badge className="border-white/10 bg-white/5 text-stone-200">{property.area} m2</Badge>
                    </div>

                    <p className="text-sm leading-7 text-stone-300">{property.description || t("landing", "published.descriptionMissing", "Description indisponible.")}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <p className="text-lg font-semibold text-[#f4dec1]">{formatPrice(property.price, property.currency)}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => setSelectedPropertyId(property.id)}>
                          {t("landing", "published.showOnMap", "Voir sur la carte")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (currentUser) {
                              onOpenDetail(property.slug || property.id);
                              return;
                            }

                            onOpenPublicDetail(property.slug || property.id);
                          }}
                        >
                          {t("landing", "published.viewDetail", "Voir detail")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-0">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{t("landing", "published.mapTitle", "Carte interactive")}</p>
            <h3 className="mt-2 font-serif text-3xl text-white">{t("landing", "published.mapHeading", "Les biens se lisent aussi par emplacement.")}</h3>
          </div>

          <div className="space-y-5 p-5">
            <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-stone-950/70">
              {!googleMapsApiKey ? (
                <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-amber-100/80">
                  {t("landing", "published.mapMissingKey", "Ajoutez `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` pour activer la carte.")}
                </div>
              ) : loadError ? (
                <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-red-200">
                  {t("landing", "published.mapError", "Impossible de charger Google Maps pour le moment.")}
                </div>
              ) : !isMapsLoaded ? (
                <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-stone-300">
                  {t("landing", "published.mapLoading", "Chargement de la carte Google...")}
                </div>
              ) : (
                <GoogleMap
                  mapContainerClassName="h-[420px] w-full"
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
                    <MarkerF
                      key={property.id}
                      position={property.mapMarker}
                      onClick={() => setSelectedPropertyId(property.id)}
                    />
                  ))}
                </GoogleMap>
              )}
            </div>

            {selectedProperty ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-stone-950/45 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-white">{selectedProperty.title}</p>
                    <p className="mt-1 text-sm text-stone-400">{selectedProperty.address || t("landing", "published.addressMissing", "Adresse non renseignee")}</p>
                  </div>
                  <PropertyStatusBadge value={selectedProperty.status} />
                </div>
                <p className="mt-4 text-lg font-semibold text-[#f4dec1]">{formatPrice(selectedProperty.price, selectedProperty.currency)}</p>
                <p className="mt-3 text-sm leading-7 text-stone-300">{selectedProperty.description || t("landing", "published.descriptionMissing", "Description indisponible.")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="border-white/10 bg-white/5 text-stone-200">{selectedProperty.type}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-stone-200">{selectedProperty.purpose}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-stone-200">{selectedProperty.agentName || t("landing", "published.agentMissing", "Agent non renseigne")}</Badge>
                </div>
                <div className="mt-5">
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentUser) {
                        onOpenDetail(selectedProperty.slug || selectedProperty.id);
                        return;
                      }

                      onOpenPublicDetail(selectedProperty.slug || selectedProperty.id);
                    }}
                  >
                    {t("landing", "published.viewDetail", "Voir detail")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 bg-stone-950/45 p-5 text-sm text-stone-300">
                {t("landing", "published.empty", "Aucun bien geolocalise n'est disponible pour le moment.")}
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

const OwnerCollection = ({ data }) => {
  const ownerProperties = data?.properties || [];
  const rentedCount = ownerProperties.filter((property) => OWNER_STATUS_LABELS[property.status] === "Loue").length;
  const availableCount = ownerProperties.filter((property) => OWNER_STATUS_LABELS[property.status] === "Disponible").length;

  return (
    <section className="space-y-6">
      <SectionHeading
        eyebrow="Collection proprietaire"
        title="Une lecture portefeuille, pas un dashboard."
        description="Pour le proprietaire connecte, la landing garde une lecture premium de son portefeuille, sans section biens supplementaire."
      />

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(201,166,107,0.14),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Signature proprietaire</p>
          <h3 className="mt-4 font-serif text-4xl text-white">Portefeuille vivant</h3>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            Vos biens, vos locataires et vos revenus se lisent ici comme une collection premium, avec une hierarchie plus claire et plus valorisante.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <StoryMetricCard label="Mes biens" value={data?.summary?.propertiesCount || 0} description="Volume actuel de biens suivis dans votre portefeuille." />
            <StoryMetricCard label="Loues" value={rentedCount} description="Biens actuellement occupes par un locataire." />
            <StoryMetricCard label="Disponibles" value={availableCount} description="Biens libres ou prets pour une nouvelle occupation." />
            <StoryMetricCard label="Revenus" value={formatPrice(data?.summary?.monthlyRevenue || 0, "AR")} description="Lecture synthétique de votre revenu mensuel." />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Locataires</p>
            <h4 className="mt-2 font-serif text-3xl text-white">{data?.summary?.tenantsCount || 0} fiches actives</h4>
            <div className="mt-5 space-y-3">
              {(data?.tenants || []).slice(0, 3).map((tenant) => (
                <div key={tenant.id} className="rounded-[1.4rem] border border-white/10 bg-stone-950/45 p-4">
                  <p className="text-base font-semibold text-white">{tenant.fullName}</p>
                  <p className="mt-1 text-sm text-stone-400">{tenant.property || "Bien non renseigne"}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Biens signature</p>
            <div className="mt-5 grid gap-3">
              {ownerProperties.slice(0, 3).map((property) => (
                <div key={property.id} className="rounded-[1.4rem] border border-white/10 bg-stone-950/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{property.title}</p>
                      <p className="mt-1 text-sm text-stone-400">{property.location}</p>
                    </div>
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100">
                      {OWNER_STATUS_LABELS[property.status] || property.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useUserPreferences();
  const { currentUser, landingQuery, ownerOverviewQuery } = useLandingOverview();
  const landingData = landingQuery.data;
  const [detailModalIdentifier, setDetailModalIdentifier] = useState("");

  const editorialMetrics = useMemo(() => {
    const summary = landingData?.summary || {};

    return [
      {
        label: "Proprietaires",
        value: summary.ownersCount || 0,
        description: "Comptes proprietaires actifs relies aux biens reellement suivis."
      },
      {
        label: "Biens en location",
        value: summary.rentPropertiesCount || 0,
        description: "Lecture immediate du volume location sur l'ecosysteme."
      },
      {
        label: "Biens disponibles",
        value: summary.availablePropertiesCount || 0,
        description: "Annonces ouvertes a la consultation et a la reservation."
      },
      {
        label: "Biens vendus",
        value: summary.soldPropertiesCount || 0,
        description: "Biens conclus visibles dans l'historique plateforme."
      }
    ];
  }, [landingData?.summary]);

  if (landingQuery.isLoading) {
    return <LandingSkeleton />;
  }

  if (landingQuery.isError) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#c9a66b]">Landing</p>
          <h1 className="mt-4 font-serif text-4xl text-white">Vue globale indisponible</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
            Les donnees reelles n'ont pas pu etre chargees depuis l'API pour le moment. Reessayez dans quelques instants.
          </p>
        </div>
      </section>
    );
  }

  const featuredAgency = (landingData?.agencies || [])[0] || null;

  return (
    <section className="mx-auto max-w-7xl space-y-14 px-6 py-16">
      <EditorialHero summary={landingData?.summary || {}} currentUser={currentUser} featuredAgency={featuredAgency} t={t} />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Lecture plateforme"
          title="Des chiffres presentes comme une histoire de marche."
          description="La landing ne s'affiche plus comme un tableau de bord. Les metriques deviennent des reperes editoriaux pour comprendre rapidement l'etat de la plateforme."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {editorialMetrics.map((item, index) => (
            <StoryMetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              description={item.description}
              accentClassName={index === 0 ? "bg-[linear-gradient(145deg,rgba(201,166,107,0.1),rgba(255,255,255,0.03))]" : ""}
            />
          ))}
        </div>
      </section>

      <PublishedPropertiesShowcase
        properties={landingData?.recentProperties || []}
        currentUser={currentUser}
        onOpenDetail={setDetailModalIdentifier}
        onOpenPublicDetail={(identifier) => navigate(`/properties/${identifier}`)}
        t={t}
      />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Reseau professionnel"
          title="Agents, agences et locataires dans une grammaire plus editoriale."
          description="Chaque section reste en lecture seule mais gagne un vrai traitement vitrine, plus premium et plus clair que l'ancien rendu en panneaux."
        />

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-4">
            <h3 className="font-serif text-2xl text-white">Agents</h3>
            {(landingData?.agents || []).slice(0, 3).map((agent) => (
              <PersonaCard
                key={agent.id}
                avatar={agent.avatar}
                name={agent.fullName}
                subtitle={agent.agencyName || "Independant"}
                badgeLabel={agent.roleLabel}
                stats={[{ label: "Biens geres", value: agent.managedPropertiesCount || 0 }]}
              />
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-2xl text-white">Agences</h3>
            {(landingData?.agencies || []).slice(0, 3).map((agency) => (
              <PersonaCard
                key={agency.id}
                avatar={agency.logo}
                name={agency.name}
                subtitle={`Statut: ${agency.status}`}
                badgeLabel="Agence"
                accent="gold"
                stats={[
                  { label: "Biens", value: agency.managedPropertiesCount || 0 },
                  { label: "Agents", value: agency.activeAgentsCount || 0 }
                ]}
              />
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-serif text-2xl text-white">Locataires</h3>
            {(landingData?.tenants || []).slice(0, 3).map((tenant) => (
              <PersonaCard
                key={tenant.id}
                avatar={tenant.avatar}
                name={tenant.fullName}
                subtitle={tenant.propertyTitle}
                badgeLabel="Locataire"
                stats={[{ label: "Source", value: tenant.source || "manual" }]}
              />
            ))}
          </div>
        </div>
      </section>

      {currentUser?.role === "proprietaire" ? (
        ownerOverviewQuery.isLoading ? (
          <Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-stone-300">
            Chargement de votre collection proprietaire...
          </Card>
        ) : ownerOverviewQuery.isError ? (
          <Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-stone-300">
            La vue proprietaire n'a pas pu etre chargee pour le moment.
          </Card>
        ) : (
          <OwnerCollection data={ownerOverviewQuery.data} />
        )
      ) : null}

      <ModalViewDetail
        open={Boolean(detailModalIdentifier)}
        propertyIdentifier={detailModalIdentifier}
        onClose={() => setDetailModalIdentifier("")}
      />
    </section>
  );
};

export default LandingPage;
