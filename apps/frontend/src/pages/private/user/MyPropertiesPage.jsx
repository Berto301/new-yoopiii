import { useMemo, useState } from "react";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { formatMoney } from "../../../app/preferences/user-preferences.utils.js";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { ScoreBadge } from "../../../components/ui/ScoreBadge.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { notifyApiErrors } from "../../../lib/errors/api-error.js";
import { resolveAssetUrl } from "../../../lib/utils/asset-url.js";
import { useSharedGoogleMapsLoader } from "../../../lib/utils/google-maps.js";
import { ModalMatchingUser } from "../Property/ModalMatchingUser.jsx";
import {
  getUserAssetDetail,
  getUserAssets,
  releaseUserAsset,
  requestUserAssetSaleContract
} from "../../../features/user-assets/services/user-assets.service.js";

const DEFAULT_CENTER = { lat: -19.872006, lng: 47.03961 };

const getCoordinates = (property) => {
  const lat = Number(property?.location?.coordinates?.[1] ?? property?.location?.lat);
  const lng = Number(property?.location?.coordinates?.[0] ?? property?.location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const AssetBadge = ({ type }) => {
  const { t } = useUserPreferences();
  return (
    <Badge className={type === "purchased" ? "border-emerald-500/25 bg-[var(--success-surface)] text-[var(--success-foreground)]" : "border-sky-500/25 bg-[var(--info-surface)] text-[var(--info-foreground)]"}>
      {type === "purchased" ? t("private", "userProperties.types.purchased", "Achete") : t("private", "userProperties.types.rented", "Loue")}
    </Badge>
  );
};

const PropertyMap = ({ property }) => {
  const { t } = useUserPreferences();
  const { googleMapsApiKey, isLoaded, loadError } = useSharedGoogleMapsLoader();
  const coordinates = getCoordinates(property);

  return (
    <Card className="border-[var(--border)] bg-[var(--surface)] p-0">
      <div className="border-b border-[var(--border)] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "userProperties.detail.map", "Emplacement")}</p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{property?.address || t("private", "userProperties.detail.addressMissing", "Adresse non renseignee")}</h3>
      </div>
      {!coordinates ? (
        <div className="flex h-72 items-center justify-center px-5 text-center text-sm text-[var(--muted)]">{t("private", "userProperties.detail.noMap", "Aucune coordonnee GPS disponible.")}</div>
      ) : !googleMapsApiKey ? (
        <div className="flex h-72 items-center justify-center px-5 text-center text-sm text-[var(--muted)]">{t("private", "userProperties.detail.missingMapKey", "Ajoutez VITE_GOOGLE_MAPS_API_KEY pour activer la carte.")}</div>
      ) : loadError ? (
        <div className="flex h-72 items-center justify-center px-5 text-center text-sm text-[var(--danger-foreground)]">{t("private", "userProperties.detail.mapError", "Impossible de charger Google Maps.")}</div>
      ) : !isLoaded ? (
        <div className="flex h-72 items-center justify-center px-5 text-center text-sm text-[var(--muted)]">{t("private", "userProperties.detail.mapLoading", "Chargement de la carte...")}</div>
      ) : (
        <GoogleMap
          mapContainerClassName="h-72 w-full"
          center={coordinates || DEFAULT_CENTER}
          zoom={15}
          options={{ disableDefaultUI: true, zoomControl: true, streetViewControl: false, mapTypeControl: false }}
        >
          <MarkerF position={coordinates} />
        </GoogleMap>
      )}
    </Card>
  );
};

const AssetCard = ({ asset, active, onSelect }) => {
  const { t, preferences } = useUserPreferences();
  const property = asset.property || {};
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-3xl border text-left transition ${active ? "border-brand-500 bg-[var(--surface)] shadow-[0_18px_60px_rgba(0,0,0,0.14)]" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]"}`}
    >
      <div className="grid gap-0 lg:grid-cols-[190px_1fr]">
        <div className="h-44 bg-[var(--surface-soft)] lg:h-full">
          {property.coverImage ? <img src={resolveAssetUrl(property.coverImage)} alt={property.title} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <AssetBadge type={asset.assetType} />
            <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{asset.status}</Badge>
            <ScoreBadge score={property.score || 0} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">{asset.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{asset.subtitle || property.address || t("private", "userProperties.addressMissing", "Adresse non renseignee")}</p>
          </div>
          <div className="grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            <p>{property.area || 0} m2</p>
            <p>{formatMoney(property.price || 0, property.currency || preferences.currency, preferences)}</p>
            <p>{property.type || "-"}</p>
          </div>
        </div>
      </div>
    </button>
  );
};

const DetailPanel = ({ detail, onRelease, onSell, onManage, onOpenMatching, releasePending, sellPending }) => {
  const { t, preferences } = useUserPreferences();
  const property = detail?.property || {};
  const contract = detail?.contract;
  const agent = detail?.agent || property.agent;
  const owner = detail?.owner || detail?.previousOwner || property.owner;

  if (!detail) {
    return null;
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] p-0">
        <div className="grid gap-0 xl:grid-cols-[360px_1fr]">
          <div className="min-h-[320px] bg-[var(--surface-soft)]">
            {property.coverImage ? <img src={resolveAssetUrl(property.coverImage)} alt={property.title} className="h-full min-h-[320px] w-full object-cover" /> : null}
          </div>
          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <AssetBadge type={detail.assetType} />
                  <Badge className="border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]">{property.status}</Badge>
                  <ScoreBadge score={property.score || 0} showScore />
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">{property.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{property.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.assetType === "purchased" ? (
                  <>
                    <Button type="button" onClick={onSell} disabled={sellPending}>{t("private", "userProperties.actions.sell", "Vendre")}</Button>
                    <Button type="button" variant="secondary" onClick={onOpenMatching}>{t("private", "userProperties.actions.matching", "Matching intelligent")}</Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="secondary" onClick={onRelease} disabled={releasePending}>{t("private", "userProperties.actions.release", "Liberer ce bien")}</Button>
                    <Button type="button" onClick={onManage}>{t("private", "userProperties.actions.manage", "Gerer")}</Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {[
                [t("private", "userProperties.detail.price", "Prix"), formatMoney(property.price || 0, property.currency || preferences.currency, preferences)],
                [t("private", "userProperties.detail.area", "Surface"), `${property.area || 0} m2`],
                [t("private", "userProperties.detail.rooms", "Pieces"), property.rooms || 0],
                [t("private", "userProperties.detail.files", "Fichiers"), property.media?.length || 0]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "userProperties.detail.contract", "Contrat associe")}</p>
          <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{contract?.reference || t("private", "userProperties.detail.noContract", "Aucun contrat")}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{contract ? `${contract.status} - ${contract.startDateLabel} / ${contract.endDateLabel}` : "-"}</p>
          {contract?.documentUrl ? <a className="mt-4 inline-flex text-sm font-medium text-accent" href={resolveAssetUrl(contract.documentUrl)} target="_blank" rel="noreferrer">{t("private", "userProperties.detail.openContract", "Ouvrir le contrat")}</a> : null}
        </Card>
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "userProperties.detail.agent", "Agent responsable")}</p>
          <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{agent?.fullName || t("private", "userProperties.detail.noAgent", "Non attribue")}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{agent?.email || agent?.phone || "-"}</p>
        </Card>
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{detail.assetType === "purchased" ? t("private", "userProperties.detail.previousOwner", "Ancien proprietaire") : t("private", "userProperties.detail.owner", "Proprietaire")}</p>
          <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{owner?.fullName || t("private", "userProperties.detail.noOwner", "Non renseigne")}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{owner?.email || owner?.phone || "-"}</p>
        </Card>
      </div>

      {property.media?.length ? (
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "userProperties.detail.filesList", "Fichiers associes")}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {property.media.map((item, index) => (
              <a key={`${item.url}-${index}`} href={resolveAssetUrl(item.url)} target="_blank" rel="noreferrer" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--foreground)]">
                {item.type || "document"} - {item.url?.split("/").pop()}
              </a>
            ))}
          </div>
        </Card>
      ) : null}

      <PropertyMap property={property} />
    </div>
  );
};

export const MyPropertiesPage = () => {
  const { t } = useUserPreferences();
  const { showError, showSuccess } = useNotification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [matchingProperty, setMatchingProperty] = useState(null);

  const assetsQuery = useQuery({ queryKey: ["user-assets"], queryFn: getUserAssets });
  const assets = useMemo(() => {
    const data = assetsQuery.data || { rented: [], purchased: [] };
    return [...(data.rented || []), ...(data.purchased || [])];
  }, [assetsQuery.data]);

  const effectiveSelected = selectedAsset || assets[0] || null;
  const detailQuery = useQuery({
    queryKey: ["user-asset-detail", effectiveSelected?.assetType, effectiveSelected?.id],
    queryFn: () => getUserAssetDetail({ assetType: effectiveSelected.assetType, assetId: effectiveSelected.id }),
    enabled: Boolean(effectiveSelected?.id)
  });

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (typeFilter !== "all" && asset.assetType !== typeFilter) return false;
      if (!query) return true;
      return [asset.title, asset.subtitle, asset.property?.address, asset.property?.type].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [assets, search, typeFilter]);

  const releaseMutation = useMutation({
    mutationFn: releaseUserAsset,
    onSuccess: () => {
      showSuccess(t("private", "userProperties.messages.releaseSuccess", "Bien libere et proprietaire notifie."));
      queryClient.invalidateQueries({ queryKey: ["user-assets"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setSelectedAsset(null);
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userProperties.messages.releaseError", "Impossible de liberer ce bien.") })
  });

  const sellMutation = useMutation({
    mutationFn: requestUserAssetSaleContract,
    onSuccess: () => {
      showSuccess(t("private", "userProperties.messages.sellSuccess", "Demande de vente envoyee a l'agent responsable."));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => notifyApiErrors({ error, showError, fallbackMessage: t("private", "userProperties.messages.sellError", "Impossible d'envoyer la demande de vente.") })
  });

  return (
    <>
      <section className="space-y-8">
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <div className="grid gap-6 xl:grid-cols-[1fr_420px] xl:items-end">
            <SectionTitle
              eyebrow={t("private", "userProperties.eyebrow", "Mes biens")}
              title={t("private", "userProperties.title", "Biens loues et achetes")}
              description={t("private", "userProperties.description", "Retrouvez vos biens, leurs contrats, agents, fichiers, paiements et actions utiles depuis un espace unique.")}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "userProperties.summary.total", "Total")}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{assetsQuery.data?.summary?.total || 0}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "userProperties.summary.rented", "Loues")}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{assetsQuery.data?.summary?.rentedCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "userProperties.summary.purchased", "Achetes")}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{assetsQuery.data?.summary?.purchasedCount || 0}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <Input label={t("private", "userProperties.filters.search", "Recherche")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("private", "userProperties.filters.placeholder", "Bien, adresse, type...")} />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "userProperties.filters.type", "Type")}</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none">
              <option value="all">{t("private", "userProperties.filters.all", "Tous")}</option>
              <option value="rented">{t("private", "userProperties.types.rented", "Loue")}</option>
              <option value="purchased">{t("private", "userProperties.types.purchased", "Achete")}</option>
            </select>
          </label>
        </div>

        {assetsQuery.isLoading ? <Card><p className="text-sm text-[var(--muted)]">{t("private", "userProperties.loading", "Chargement de vos biens...")}</p></Card> : null}
        {assetsQuery.isError ? <Card className="border-red-500/20 bg-[var(--danger-surface)]"><p className="text-sm text-[var(--danger-foreground)]">{t("private", "userProperties.error", "Impossible de charger vos biens.")}</p></Card> : null}

        <div className="grid gap-6 2xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            {filteredAssets.map((asset) => (
              <AssetCard key={`${asset.assetType}-${asset.id}`} asset={asset} active={effectiveSelected?.id === asset.id && effectiveSelected?.assetType === asset.assetType} onSelect={() => setSelectedAsset(asset)} />
            ))}
            {!filteredAssets.length && !assetsQuery.isLoading ? (
              <Card className="border-dashed border-[var(--border)] text-center">
                <p className="text-sm text-[var(--muted)]">{t("private", "userProperties.empty", "Aucun bien ne correspond aux filtres.")}</p>
              </Card>
            ) : null}
          </div>
          <div>
            {detailQuery.isLoading ? <Card><p className="text-sm text-[var(--muted)]">{t("private", "userProperties.detail.loading", "Chargement du detail...")}</p></Card> : null}
            {detailQuery.data ? (
              <DetailPanel
                detail={detailQuery.data}
                releasePending={releaseMutation.isPending}
                sellPending={sellMutation.isPending}
                onRelease={() => releaseMutation.mutate({ assetType: detailQuery.data.assetType, assetId: detailQuery.data.id })}
                onSell={() => sellMutation.mutate({ assetId: detailQuery.data.id })}
                onManage={() => navigate(`/my-properties/rented/${detailQuery.data.id}/manage`)}
                onOpenMatching={() => setMatchingProperty(detailQuery.data.property)}
              />
            ) : null}
          </div>
        </div>
      </section>
      <ModalMatchingUser open={Boolean(matchingProperty)} property={matchingProperty} onClose={() => setMatchingProperty(null)} />
    </>
  );
};

export default MyPropertiesPage;
