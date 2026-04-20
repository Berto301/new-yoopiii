import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";
import { createConversation } from "../../features/chat/services/chat.service.js";
import { usePropertyWorkspace } from "../../features/properties/hooks/usePropertyWorkspace.js";

const formatPrice = (value, currency = "AR") =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value || 0)} ${currency || "AR"}`.trim();

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

export const PublicationsPage = () => {
  const navigate = useNavigate();
  const { user, propertyPublicationsQuery, favoriteMutation, reservationMutation } = usePropertyWorkspace();
  const items = propertyPublicationsQuery.data?.items || [];

  const groupedByAgent = useMemo(() => {
    const groups = new Map();

    items.forEach((property) => {
      const key = property.agentId || property.agentName;
      const current = groups.get(key) || {
        agentId: property.agentId,
        agentName: property.agentName,
        agencyName: property.agencyName,
        items: []
      };

      current.items.push(property);
      groups.set(key, current);
    });

    return [...groups.values()];
  }, [items]);

  const canManageReservation = ["agency", "agency_agent", "independent_agent"].includes(user?.role);
  const canFavoriteProperties = user?.role === "user";

  const handleOpenConversation = async (property) => {
    if (!property.agentId || !user) {
      return;
    }

    const conversation = await createConversation({
      participantId: property.agentId,
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

  if (propertyPublicationsQuery.isLoading) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Publications" title="Publication des biens" description="Chargement des publications d'agents." />
        <Card><p className="text-sm text-stone-300">Chargement des publications...</p></Card>
      </section>
    );
  }

  if (propertyPublicationsQuery.isError) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Publications" title="Publication des biens" description="Le flux de publications n'a pas pu etre charge." />
        <Card><p className="text-sm text-red-300">Une erreur est survenue lors du chargement des publications.</p></Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow="Publications"
        title="Publication des biens"
        description="Parcourez les biens publies par les agents dans un feed detaille, avec favoris, reservation exclusive et suivi du statut."
      />

      <div className="space-y-8">
        {groupedByAgent.map((group) => (
          <div key={group.agentId || group.agentName} className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Agent</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{group.agentName}</h2>
              <p className="mt-1 text-sm text-stone-300">{group.agencyName || "Agence non renseignee"}</p>
            </div>

            {group.items.map((property) => {
              const mediaPreview = property.media?.slice(0, 3) || [];
              const isReservedByOtherUser = property.status === "reserved" && !property.isReservedByCurrentUser;
              const isReserveActionDisabled = reservationMutation.isPending || property.status !== "published";
              const ownerDisplay = property.publicationOwnerDisplay;
              const showOwnerBlock =
                ownerDisplay &&
                (ownerDisplay.showOwnerName || ownerDisplay.showOwnerContact || ownerDisplay.allowDirectOwnerChat);

              return (
                <Card
                  key={property.id}
                  className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-0"
                >
                  <div className="grid gap-0 xl:grid-cols-[1.25fr_1fr]">
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
                      </div>
                    </div>

                    <div className="space-y-5 p-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-2xl font-semibold text-white">{property.title}</h3>
                          {property.has3DView ? <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-100">3D</Badge> : null}
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
                              <Button type="button" variant="secondary" onClick={() => handleOpenOwnerConversation(property)}>
                                Discuter avec le proprietaire
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
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleOpenConversation(property)}
                        >
                          Discuter
                        </Button>

                        <Button
                          type="button"
                          variant={property.isFavorite ? "secondary" : "primary"}
                          disabled={favoriteMutation.isPending || !canFavoriteProperties}
                          onClick={() => favoriteMutation.mutate({ propertyId: property.id, isFavorite: property.isFavorite })}
                        >
                          {!canFavoriteProperties ? "Favori indisponible" : property.isFavorite ? "Retirer des favoris" : "Mettre en favori"}
                        </Button>

                        {!canManageReservation ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isReserveActionDisabled}
                            onClick={() => reservationMutation.mutate({ propertyId: property.id, action: "reserve" })}
                          >
                            {property.isReservedByCurrentUser ? "Reserve par vous" : isReservedByOtherUser ? "Deja reserve" : "Reserver"}
                          </Button>
                        ) : property.status === "reserved" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="border-amber-500/40 text-amber-100 hover:border-amber-400 hover:bg-amber-500/10"
                            disabled={reservationMutation.isPending}
                            onClick={() => reservationMutation.mutate({ propertyId: property.id, action: "release" })}
                          >
                            Annuler la reservation
                          </Button>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-stone-400">
                            Disponible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

        {!groupedByAgent.length ? (
          <Card>
            <p className="text-sm text-stone-300">Aucune publication disponible pour le moment.</p>
          </Card>
        ) : null}
      </div>
    </section>
  );
};

export default PublicationsPage;
