import { Link } from "react-router-dom";
import { formatMoney } from "../../../app/preferences/user-preferences.utils.js";
import { Badge } from "../../../components/ui/Badge.jsx";
import { ScoreBadge } from "../../../components/ui/ScoreBadge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { resolveAssetUrl } from "../../../lib/utils/asset-url.js";
import { getPropertyThreeDStatusMeta, hasPropertyThreeDLink } from "../property-3d.js";
import { PROPERTY_SCORE_CRITERIA, ScoreDetailsPanel } from "../../scoring/ScoreDetailsPanel.jsx";

const formatPrice = (value, currency = "USD") => formatMoney(value, currency);

const getStatusClassName = (status) => {
  if (status === "published") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "reserved") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  if (status === "sold") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-100";
  }

  if (status === "rented") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-100";
  }

  return "border-white/10 bg-white/5 text-stone-200";
};

export const buildPropertyDetailMediaItems = (property) => {
  const media = Array.isArray(property?.media) ? property.media : [];
  const gallery = media.filter((item) => item.type === "image" && item.url);
  const coverImage = property?.coverImage
    ? {
        type: "image",
        url: property.coverImage,
        thumbnailUrl: property.coverImage,
        order: -1
      }
    : null;

  if (!coverImage) {
    return gallery;
  }

  const hasCoverInGallery = gallery.some((item) => item.url === property.coverImage);
  return hasCoverInGallery ? gallery : [coverImage, ...gallery];
};

export const PropertyDetailContent = ({
  property,
  selectedImageUrl,
  onSelectImage,
  showBrowseButton = false,
  browseHref = "/login",
  browseLabel = "Voir les autres biens"
}) => {
  const mediaItems = buildPropertyDetailMediaItems(property);
  const selectedImage = selectedImageUrl || mediaItems[0]?.url || "";
  const specificationItems = [
    { label: "Type", value: property.type || "-" },
    { label: "Objectif", value: property.purpose || "-" },
    { label: "Surface", value: `${property.area || 0} m2` },
    { label: "Pieces", value: property.rooms ?? 0 },
    { label: "Chambres", value: property.bedrooms ?? 0 },
    { label: "Salles de bain", value: property.bathrooms ?? 0 }
  ];
  const threeDStatus = getPropertyThreeDStatusMeta({
    is3DEnabled: hasPropertyThreeDLink(property),
    status: hasPropertyThreeDLink(property) ? "generated" : null
  });
  const hasThreeDLink = hasPropertyThreeDLink(property);

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={getStatusClassName(property.status)}>{property.status}</Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-200">{property.type}</Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-200">{property.purpose}</Badge>
          <ScoreBadge score={property.score || 0} showScore />
          {property.isUnderMaintenance ? (
            <Badge className="border-amber-400/30 bg-amber-500/15 text-amber-100">En maintenance</Badge>
          ) : null}
          {hasThreeDLink ? (
            <Badge className={threeDStatus.className}>3D {threeDStatus.label}</Badge>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a66b]">Annonce detail</p>
          <h1 className="font-serif text-4xl leading-tight text-white md:text-6xl">{property.title}</h1>
          <p className="max-w-4xl text-base leading-8 text-stone-300">{property.address || "Adresse non renseignee"}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-stone-950/70">
            {selectedImage ? (
              <img
                src={resolveAssetUrl(selectedImage)}
                alt={property.title}
                className="h-[520px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[520px] items-end bg-[radial-gradient(circle_at_top_left,rgba(201,166,107,0.24),transparent_32%),linear-gradient(135deg,rgba(41,37,36,1),rgba(12,10,9,1))] p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Bien publie</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{property.title}</p>
                </div>
              </div>
            )}
          </div>

          {mediaItems.length ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {mediaItems.map((item, index) => {
                const imageUrl = resolveAssetUrl(item.thumbnailUrl || item.url);
                const isActive = (item.url || "") === selectedImageUrl || (!selectedImageUrl && index === 0);

                return (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => onSelectImage(item.url)}
                    className={`overflow-hidden rounded-[1.4rem] border ${isActive ? "border-[#c9a66b]" : "border-white/10"} bg-stone-950/70 transition`}
                  >
                    <img src={imageUrl} alt={`${property.title} ${index + 1}`} className="h-24 w-full object-cover" />
                  </button>
                );
              })}
            </div>
          ) : null}

          <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Description</p>
            <p className="mt-4 text-sm leading-8 text-stone-300">{property.description || "Description indisponible."}</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-white/10 bg-[linear-gradient(145deg,rgba(201,166,107,0.12),rgba(255,255,255,0.03))]">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Prix</p>
            <p className="mt-3 font-serif text-4xl text-[#f4dec1]">{formatPrice(property.price, property.currency)}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {specificationItems.map((item) => (
                <div key={item.label} className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <ScoreDetailsPanel
            title="Score du bien"
            score={property.score || 0}
            details={property.scoreDetails}
            criteria={PROPERTY_SCORE_CRITERIA}
          />

          <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Intervenants</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[1.4rem] border border-white/10 bg-stone-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agent</p>
                <p className="mt-2 text-base font-semibold text-white">{property.agentName || "Non attribue"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-stone-950/45 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agence</p>
                <p className="mt-2 text-base font-semibold text-white">{property.agencyName || "Aucune agence"}</p>
              </div>
              {(property.publicationOwnerDisplay?.showOwnerName || property.publicationOwnerDisplay?.showOwnerContact) ? (
                <div className="rounded-[1.4rem] border border-white/10 bg-stone-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Proprietaire</p>
                  {property.publicationOwnerDisplay?.showOwnerName ? (
                    <p className="mt-2 text-base font-semibold text-white">{property.ownerName || "Proprietaire"}</p>
                  ) : null}
                  {property.publicationOwnerDisplay?.showOwnerContact ? (
                    <p className="mt-2 text-sm text-stone-300">{property.ownerPhone || property.ownerEmail || "Contact non renseigne"}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Caracteristiques</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(property.features || []).length ? (
                property.features.map((feature) => (
                  <Badge key={feature} className="border-white/10 bg-white/5 text-stone-200">
                    {feature}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-stone-400">Aucune caracteristique supplementaire renseignee.</p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {showBrowseButton ? (
                <Button as={Link} to={browseHref}>
                  {browseLabel}
                </Button>
              ) : null}
              {hasThreeDLink ? (
                <Button as="a" href={property.threeDUrl} target="_blank" rel="noreferrer" variant="secondary">
                  Ouvrir la visite 3D
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
