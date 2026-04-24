import { useMemo, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatMoney } from "../../app/preferences/user-preferences.utils.js";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { getPropertyPublications } from "../../features/properties/services/property.service.js";
import { useSharedGoogleMapsLoader } from "../../lib/utils/google-maps.js";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";

const DEFAULT_MAP_CENTER = { lat: -19.872006, lng: 47.03961 };

const formatPrice = (value, currency = "AR") => formatMoney(value, currency);

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

const PropertySearchSkeleton = () => (
  <section className="mx-auto max-w-7xl px-6 py-16">
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-40 rounded-full bg-stone-200" />
      <div className="h-12 w-1/2 rounded-[1rem] bg-stone-200" />
    </div>
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[360px] rounded-[2rem] bg-stone-200 animate-pulse" />
        ))}
      </div>
      <div className="h-[640px] rounded-[2rem] bg-stone-200 animate-pulse" />
    </div>
  </section>
);

const PropertyCard = ({ property, onOpen }) => (
  <article className="overflow-hidden rounded-[1.75rem] border border-[rgba(157,93,67,0.12)] bg-white shadow-[0_18px_40px_rgba(45,30,23,0.1)] transition hover:-translate-y-1">
    <div className="relative h-56 overflow-hidden">
      <img
        src={property.coverImage ? resolveAssetUrl(property.coverImage) : "/assets/hero-bg.jpg"}
        alt={property.title}
        className="h-full w-full object-cover"
      />
      <span className="absolute left-4 top-4 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white">
        {property.purpose || "For Sell"}
      </span>
    </div>
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#f4e1d7] px-3 py-1 text-xs font-medium text-brand-500">{property.type || "Property"}</span>
        <span className="text-sm font-medium text-brand-500">{formatPrice(property.price, property.currency)}</span>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-stone-950">{property.title}</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
          <PinIcon />
          <span>{property.address || "Antsirabe, Madagascar"}</span>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-stone-200 pt-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><BedIcon /> {property.bedrooms ?? 3} Beds</span>
        <span className="flex items-center gap-1.5"><BathIcon /> {property.bathrooms ?? 3} Baths</span>
        <span className="flex items-center gap-1.5"><AreaIcon /> {property.area || 1000} m2</span>
      </div>
      <Button type="button" className="w-full bg-brand-500 text-white hover:bg-brand-700" onClick={onOpen}>
        Voir le detail
      </Button>
    </div>
  </article>
);

export const PropertySearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { googleMapsApiKey, isLoaded: isMapsLoaded, loadError } = useSharedGoogleMapsLoader();
  const publicationFilters = useMemo(
    () => ({
      page: 1,
      limit: 100,
      ...(searchParams.get("search") ? { search: searchParams.get("search") } : {}),
      ...(searchParams.get("type") ? { type: searchParams.get("type") } : {}),
      ...(searchParams.get("location") ? { location: searchParams.get("location") } : {})
    }),
    [searchParams]
  );
  const propertiesQuery = useQuery({
    queryKey: ["public-property-search-preview", publicationFilters],
    queryFn: () => getPropertyPublications(publicationFilters)
  });

  const properties = useMemo(() => propertiesQuery.data?.items || [], [propertiesQuery.data?.items]);
  const mapItems = useMemo(
    () =>
      properties
        .map((property) => {
          const lat = Number(property?.mapMarker?.lat ?? property?.location?.coordinates?.[1]);
          const lng = Number(property?.mapMarker?.lng ?? property?.location?.coordinates?.[0]);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }

          return { ...property, coordinates: { lat, lng } };
        })
        .filter(Boolean),
    [properties]
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const selectedProperty = mapItems.find((item) => item.id === selectedPropertyId) || mapItems[0] || null;

  if (propertiesQuery.isLoading) {
    return <PropertySearchSkeleton />;
  }

  if (propertiesQuery.isError) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <Card className="rounded-[2rem] border-[rgba(157,93,67,0.12)] bg-white text-stone-600">
          <h1 className="text-3xl font-bold text-stone-950">Biens indisponibles</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7">Les biens publics n'ont pas pu etre charges pour le moment.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <SectionTitle
        eyebrow="Recherche immobiliere"
        title="Tous les biens publies"
        description="Cette page publique affiche les biens disponibles avec leur carte Google interactive. Cliquez sur un marker pour voir le bien correspondant et ouvrir sa fiche detail."
      />

      {(publicationFilters.search || publicationFilters.type || publicationFilters.location) ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {publicationFilters.search ? (
            <span className="rounded-full bg-[#f4e1d7] px-4 py-2 text-sm font-medium text-brand-500">
              Mot-cle: {publicationFilters.search}
            </span>
          ) : null}
          {publicationFilters.type ? (
            <span className="rounded-full bg-[#f4e1d7] px-4 py-2 text-sm font-medium text-brand-500">
              Type: {publicationFilters.type}
            </span>
          ) : null}
          {publicationFilters.location ? (
            <span className="rounded-full bg-[#f4e1d7] px-4 py-2 text-sm font-medium text-brand-500">
              Localisation: {publicationFilters.location}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6 md:grid-cols-2">
          {properties.length ? (
            properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onOpen={() => {
                  if (mapItems.some((item) => item.id === property.id)) {
                    setSelectedPropertyId(property.id);
                  }

                  navigate(`/properties/${property.slug || property.id}`);
                }}
              />
            ))
          ) : (
            <Card className="md:col-span-2 rounded-[2rem] border-[rgba(157,93,67,0.12)] bg-white p-8 text-stone-600">
              <h2 className="text-2xl font-bold text-stone-950">Aucun bien ne correspond a ces filtres</h2>
              <p className="mt-3 text-sm leading-7">
                Ajustez la recherche depuis la landing ou retirez quelques filtres pour voir davantage de publications.
              </p>
            </Card>
          )}
        </div>

        <Card className="rounded-[2rem] border-[rgba(157,93,67,0.12)] bg-white p-0 shadow-[0_20px_45px_rgba(45,30,23,0.1)]">
          <div className="border-b border-stone-200 px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">Carte interactive</p>
            <h3 className="mt-2 text-2xl font-bold text-stone-950">Tous les biens geolocalises</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Cliquez sur un marker pour afficher le detail rapide du bien sans quitter la carte.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[#f7f9f8]">
              {!googleMapsApiKey ? (
                <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-stone-500">
                  Ajoutez `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` pour activer la carte Google.
                </div>
              ) : loadError ? (
                <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-red-400">
                  Impossible de charger Google Maps pour le moment.
                </div>
              ) : !isMapsLoaded ? (
                <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-stone-500">
                  Chargement de la carte Google...
                </div>
              ) : (
                <GoogleMap
                  mapContainerClassName="h-[420px] w-full"
                  center={selectedProperty?.coordinates || mapItems[0]?.coordinates || DEFAULT_MAP_CENTER}
                  zoom={selectedProperty?.coordinates ? 14 : 12}
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
                    <MarkerF key={property.id} position={property.coordinates} onClick={() => setSelectedPropertyId(property.id)} />
                  ))}
                </GoogleMap>
              )}
            </div>

            {selectedProperty ? (
              <div className="rounded-[1.5rem] border border-stone-200 bg-[#fdf8f5] p-5">
                <div className="flex items-start gap-4">
                  <img
                    src={selectedProperty.coverImage ? resolveAssetUrl(selectedProperty.coverImage) : "/assets/hero-bg.jpg"}
                    alt={selectedProperty.title}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold text-stone-950">{selectedProperty.title}</p>
                    <p className="mt-1 text-sm text-stone-500">{selectedProperty.address || "Adresse non renseignee"}</p>
                    <p className="mt-3 text-lg font-semibold text-brand-500">{formatPrice(selectedProperty.price, selectedProperty.currency)}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-stone-500">
                      <span className="flex items-center gap-1.5"><BedIcon /> {selectedProperty.bedrooms ?? 0} Beds</span>
                      <span className="flex items-center gap-1.5"><BathIcon /> {selectedProperty.bathrooms ?? 0} Baths</span>
                      <span className="flex items-center gap-1.5"><AreaIcon /> {selectedProperty.area || 0} m2</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button
                    type="button"
                    className="bg-brand-500 text-white hover:bg-brand-700"
                    onClick={() => navigate(`/properties/${selectedProperty.slug || selectedProperty.id}`)}
                  >
                    Voir le detail
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-stone-200 bg-[#fdf8f5] p-5 text-sm text-stone-500">
                Aucun bien geolocalise n'est disponible pour le moment.
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};
