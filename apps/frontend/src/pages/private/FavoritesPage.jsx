import { useMemo } from "react";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { usePropertyWorkspace } from "../../features/properties/hooks/usePropertyWorkspace.js";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";

const formatPrice = (value, currency = "AR") =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value || 0)} ${currency || "AR"}`.trim();

const getPropertyCover = (property) => resolveAssetUrl(property.coverImage || property.media?.find((item) => item.type === "image")?.url || "");

const getPropertySpecs = (property) => [
  property.area ? `${property.area} m2` : null,
  property.rooms ? `${property.rooms} pieces` : null,
  property.bedrooms ? `${property.bedrooms} chambres` : null,
  property.bathrooms ? `${property.bathrooms} salles de bain` : null
].filter(Boolean);

const getStatusClassName = (property) => {
  if (property.status === "reserved") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
};

export const FavoritesPage = () => {
  const { favoritePropertiesQuery, favoriteMutation } = usePropertyWorkspace();
  const items = favoritePropertiesQuery.data?.items || [];

  const metrics = useMemo(() => {
    const reserved = items.filter((item) => item.status === "reserved").length;
    const with3D = items.filter((item) => item.has3DView).length;
    const averageBudget = items.length ? Math.round(items.reduce((sum, item) => sum + (item.price || 0), 0) / items.length) : 0;

    return [
      { label: "Biens suivis", value: items.length },
      { label: "Reservations observees", value: reserved },
      { label: "Visites 3D", value: with3D },
      { label: "Budget moyen", value: formatPrice(averageBudget) }
    ];
  }, [items]);

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_30%),linear-gradient(180deg,rgba(28,25,23,0.96),rgba(12,10,9,0.98))] p-6 shadow-[0_32px_90px_rgba(15,23,42,0.3)] lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.9fr] xl:items-end">
          <SectionTitle
            eyebrow="Favoris"
            title="Vos biens suivis avec une lecture plus premium"
            description="Comparez rapidement les annonces que vous gardez en vue avec photo, caracteristiques clefs et interlocuteur principal."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((property) => {
          const coverImage = getPropertyCover(property);
          const specs = getPropertySpecs(property);
          const features = property.features?.slice(0, 5) || [];

          return (
            <Card
              key={property.id}
              className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-0 shadow-[0_24px_60px_rgba(15,23,42,0.24)]"
            >
              <div className="grid gap-0 xl:grid-cols-[1.05fr_1.35fr]">
                <div className="relative min-h-[290px] bg-stone-950">
                  {coverImage ? (
                    <img src={coverImage} alt={property.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[290px] items-center justify-center bg-[linear-gradient(135deg,rgba(249,115,22,0.25),rgba(28,25,23,0.96))] text-sm uppercase tracking-[0.22em] text-stone-100">
                      Bien immobilier
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <Badge className={getStatusClassName(property)}>{property.status || "publie"}</Badge>
                    {property.purpose ? <Badge className="border-white/10 bg-black/30 text-white">{property.purpose}</Badge> : null}
                    {property.type ? <Badge className="border-white/10 bg-white/10 text-stone-100">{property.type}</Badge> : null}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-300">Adresse complete</p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">{property.address || "Adresse non disponible"}</p>
                  </div>
                </div>

                <div className="space-y-6 p-6 lg:p-7">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold text-white">{property.title}</h2>
                        {property.has3DView ? <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-100">Visite 3D</Badge> : null}
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-stone-300">{property.description || "Aucune description detaillee n'est disponible pour ce bien."}</p>
                    </div>

                    <div className="rounded-3xl border border-brand-500/20 bg-brand-500/10 px-5 py-4 text-right shadow-[0_18px_40px_rgba(249,115,22,0.15)]">
                      <p className="text-xs uppercase tracking-[0.2em] text-brand-100/80">Budget</p>
                      <p className="mt-2 text-2xl font-semibold text-brand-100">{formatPrice(property.price, property.currency)}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Caracteristiques</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {specs.length ? specs.map((spec) => (
                          <Badge key={spec} className="border-white/10 bg-white/5 text-stone-200">{spec}</Badge>
                        )) : <span className="text-sm text-stone-400">Caracteristiques en attente.</span>}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {features.length ? features.map((feature) => (
                          <span key={feature} className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-300">
                            {feature}
                          </span>
                        )) : <span className="text-sm text-stone-400">Aucune option supplementaire renseignee.</span>}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Agent responsable</p>
                      <div className="mt-4 flex items-center gap-4">
                        <Avatar
                          src={property.agentAvatar}
                          alt={`Photo de ${property.agentName || "l'agent"}`}
                          name={property.agentName || "Agent"}
                          size="lg"
                          variant="message"
                          type="agent"
                        />
                        <div>
                          <p className="text-lg font-semibold text-white">{property.agentName || "Agent non renseigne"}</p>
                          <p className="mt-1 text-sm text-stone-400">Suivi commercial du bien</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-stone-300">
                        Conservez ici une vue nette du bien, de ses points forts et de l'interlocuteur a contacter au bon moment.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                      <span className="rounded-full border border-white/10 px-3 py-2">Favori actif</span>
                      <span className="rounded-full border border-white/10 px-3 py-2">{property.favoriteCount || 0} favoris</span>
                    </div>

                    <Button
                      variant="secondary"
                      className="px-5 py-3"
                      disabled={favoriteMutation.isPending}
                      onClick={() => favoriteMutation.mutate({ propertyId: property.id, isFavorite: true })}
                    >
                      Retirer des favoris
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {!items.length ? (
          <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Favoris</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Aucun bien en favori pour le moment</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
              Des que vous commencez a suivre des annonces, elles apparaitront ici avec leur photo, leurs caracteristiques principales et le contact associe.
            </p>
          </Card>
        ) : null}
      </div>
    </section>
  );
};

export default FavoritesPage;
