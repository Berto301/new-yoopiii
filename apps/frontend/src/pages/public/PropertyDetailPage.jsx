import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { getPublicPropertyDetail } from "../../features/properties/services/property.service.js";
import { PropertyDetailContent, buildPropertyDetailMediaItems } from "../../features/properties/components/PropertyDetailContent.jsx";
import { useSharedGoogleMapsLoader } from "../../lib/utils/google-maps.js";
import { selectCurrentUser } from "../../app/store/session.store.js";
import { ModalShowBien } from "../private/Property/ModalShowBien.jsx";

const DEFAULT_MAP_CENTER = { lat: -19.872006, lng: 47.03961 };

const PropertyDetailSkeleton = () => (
  <section className="mx-auto max-w-7xl space-y-8 px-6 py-16">
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-40 rounded-full bg-white/10" />
      <div className="h-12 w-2/3 rounded-[1rem] bg-white/10" />
      <div className="h-5 w-full rounded-full bg-white/10" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="h-[520px] rounded-[2rem] border border-white/10 bg-white/5" />
      <div className="space-y-6">
        <div className="h-64 rounded-[2rem] border border-white/10 bg-white/5" />
        <div className="h-48 rounded-[2rem] border border-white/10 bg-white/5" />
      </div>
    </div>
  </section>
);

export const PropertyDetailPage = () => {
  const { id } = useParams();
  const { t } = useUserPreferences();
  const { googleMapsApiKey, isLoaded: isMapsLoaded, loadError } = useSharedGoogleMapsLoader();
  const currentUser = useSelector(selectCurrentUser);
  const [directionProperty, setDirectionProperty] = useState(null);
  const detailQuery = useQuery({
    queryKey: ["public-property-detail", id],
    queryFn: () => getPublicPropertyDetail(id),
    enabled: Boolean(id)
  });
  const property = detailQuery.data || null;
  const [selectedImageUrl, setSelectedImageUrl] = useState("");

  useEffect(() => {
    const mediaItems = buildPropertyDetailMediaItems(property);
    setSelectedImageUrl(mediaItems[0]?.url || "");
  }, [property]);

  const markerPosition = useMemo(() => {
    const lat = Number(property?.mapMarker?.lat ?? property?.location?.coordinates?.[1]);
    const lng = Number(property?.mapMarker?.lng ?? property?.location?.coordinates?.[0]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }, [property]);

  if (detailQuery.isLoading) {
    return <PropertyDetailSkeleton />;
  }

  if (detailQuery.isError || !property) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--brand-contrast)]">{t("private", "propertyDetail.eyebrow", "Annonce detail")}</p>
          <h1 className="mt-4 font-serif text-4xl text-[var(--foreground)]">{t("private", "propertyDetail.notFoundTitle", "Bien introuvable")}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
            {t("private", "propertyDetail.notFoundDescription", "Le bien demande n'est pas disponible ou n'est plus publie pour le moment.")}
          </p>
          <div className="mt-6">
            <Button as={Link} to="/properties" variant="secondary">
              {t("private", "propertyDetail.backToProperties", "Retour aux biens")}
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-6 py-16">
      <PropertyDetailContent
        property={property}
        selectedImageUrl={selectedImageUrl}
        onSelectImage={setSelectedImageUrl}
        showBrowseButton
        browseHref="/login"
        showDirectionButton={currentUser?.role === "user"}
        onOpenDirection={setDirectionProperty}
      />

      <Card className="rounded-[2rem] border-[var(--border)] bg-[var(--surface)] p-0 shadow-[0_20px_45px_rgba(45,30,23,0.1)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-contrast)]">{t("private", "propertyDetail.map.eyebrow", "Localisation")}</p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--foreground)]">{t("private", "propertyDetail.map.title", "Voir le bien sur la carte")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            {property.address || t("private", "propertyDetail.map.description", "La localisation du bien est affichee ici lorsqu'une position GPS est disponible.")}
          </p>
        </div>

        <div className="p-5">
          <div className="overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-[var(--public-map-bg)]">
            {!googleMapsApiKey ? (
              <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
                {t("private", "propertyDetail.map.missingKey", "Ajoutez `VITE_GOOGLE_MAPS_API_KEY` pour activer la carte Google.")}
              </div>
            ) : loadError ? (
              <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-[var(--danger-foreground)]">
                {t("private", "propertyDetail.map.error", "Impossible de charger Google Maps pour le moment.")}
              </div>
            ) : !isMapsLoaded ? (
              <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
                {t("private", "propertyDetail.map.loading", "Chargement de la carte Google...")}
              </div>
            ) : !markerPosition ? (
              <div className="flex h-[420px] items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
                {t("private", "propertyDetail.map.noCoordinates", "Aucune coordonnee n'est disponible pour ce bien.")}
              </div>
            ) : (
              <GoogleMap
                mapContainerClassName="h-[420px] w-full"
                center={markerPosition || DEFAULT_MAP_CENTER}
                zoom={15}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  clickableIcons: false
                }}
              >
                <MarkerF position={markerPosition} />
              </GoogleMap>
            )}
          </div>
        </div>
      </Card>
      <ModalShowBien
        open={Boolean(directionProperty)}
        property={directionProperty}
        user={currentUser}
        onClose={() => setDirectionProperty(null)}
      />
    </section>
  );
};

export default PropertyDetailPage;

