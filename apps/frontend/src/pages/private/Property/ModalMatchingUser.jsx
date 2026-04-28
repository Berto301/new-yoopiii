import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { createConversation } from "../../../features/chat/services/chat.service.js";
import { SMART_MATCHING_SCORE_OPTIONS } from "../../../features/matching/matching.constants.js";
import { computeUserPropertyMatch, formatSmartMatchingSummary } from "../../../features/matching/matching.utils.js";
import { getUsers } from "../../../features/settings/services/settings.service.js";

const MATCH_STATUS_OPTIONS = [
  { label: "Tous les profils", value: "all" },
  { label: "Matches forts", value: "strong" },
  { label: "Matches partiels", value: "partial" }
];

const scoreToneClassName = (score) => {
  if (score >= 85) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  }

  if (score >= 70) {
    return "border-sky-400/30 bg-sky-500/10 text-sky-100";
  }

  return "border-amber-400/30 bg-amber-500/10 text-amber-100";
};

const matchCheckBadgeClassName = (isMatched) =>
  isMatched
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : "border-white/10 bg-white/5 text-stone-300";

export const ModalMatchingUser = ({
  open,
  property,
  onClose
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [minimumScore, setMinimumScore] = useState(SMART_MATCHING_SCORE_OPTIONS[1]);
  const [matchStatus, setMatchStatus] = useState(MATCH_STATUS_OPTIONS[0]);
  const usersQuery = useQuery({
    queryKey: ["smart-matching-users", property?.id],
    queryFn: getUsers,
    enabled: Boolean(open && property?.id)
  });

  const matchItems = useMemo(() => {
    return (usersQuery.data || [])
      .filter((user) => user?.role === "user")
      .map((user) => computeUserPropertyMatch({ user, property }))
      .filter(Boolean)
      .filter((item) => {
        const fullName = [item.user?.firstName, item.user?.lastName].filter(Boolean).join(" ").trim().toLowerCase();
        const query = search.trim().toLowerCase();

        if (query && !fullName.includes(query) && !String(item.user?.email || "").toLowerCase().includes(query)) {
          return false;
        }

        if (item.score < (minimumScore?.value || 0)) {
          return false;
        }

        if (matchStatus?.value === "strong" && !item.isStrongMatch) {
          return false;
        }

        if (matchStatus?.value === "partial" && item.isStrongMatch) {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.score - left.score);
  }, [matchStatus?.value, minimumScore?.value, property, search, usersQuery.data]);

  const handleDiscuss = async (user) => {
    const conversation = await createConversation({
      participantId: user.id || user._id,
      propertyId: property?.id || null
    });

    onClose?.();
    navigate(`/messages?conversationId=${conversation.id}`);
  };

  return (
    <ModalLayout
      open={open}
      title="Matching intelligent"
      onClose={onClose}
      footerContent={(
        <div className="flex justify-end border-t border-white/10 pt-4">
          <Button type="button" variant="secondary" className="px-5 py-3" onClick={onClose}>
            Fermer
          </Button>
        </div>
      )}
      panelClassName="max-w-6xl"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-100/80">Prospection assistee</p>
              <h3 className="text-2xl font-semibold text-white">Utilisateurs potentiellement interesses par ce bien</h3>
              <p className="max-w-3xl text-sm leading-6 text-stone-300">
                Le scoring actuel repose sur des regles explicites et maintenables. La structure est prete pour accueillir plus tard une couche IA sans casser l&apos;experience existante.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Bien</p>
                <p className="mt-2 text-lg font-semibold text-white">{property?.title || "Bien selectionne"}</p>
                <p className="mt-2 text-sm text-stone-300">{property?.address || "Adresse non renseignee"}</p>
              </Card>
              <Card className="border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Candidats filtres</p>
                <p className="mt-2 text-3xl font-semibold text-white">{matchItems.length}</p>
                <p className="mt-2 text-sm text-stone-300">Profils actifs avec matching intelligent active.</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-white/10 bg-black/10 p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_260px_260px]">
            <Input
              label="Recherche"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom ou email"
            />
            <BaseListBox
              label="Score minimum"
              options={SMART_MATCHING_SCORE_OPTIONS}
              value={minimumScore}
              onChange={setMinimumScore}
            />
            <BaseListBox
              label="Type de match"
              options={MATCH_STATUS_OPTIONS}
              value={matchStatus}
              onChange={setMatchStatus}
            />
          </div>
        </section>

        {usersQuery.isLoading ? (
          <Card className="border-white/10 bg-white/5">
            <p className="text-sm text-stone-300">Chargement des profils a analyser...</p>
          </Card>
        ) : usersQuery.isError ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <p className="text-sm text-red-200">Impossible de charger les profils pour le matching.</p>
          </Card>
        ) : !matchItems.length ? (
          <Card className="border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-center">
            <p className="text-sm font-medium text-white">Aucun utilisateur ne correspond aux filtres actuels.</p>
            <p className="mt-2 text-sm leading-6 text-stone-400">Essayez d&apos;abaisser le score minimum ou d&apos;enlever le filtre de type de match.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {matchItems.map((item) => {
              const user = item.user;
              const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Utilisateur";
              const summary = formatSmartMatchingSummary(item.matching);

              return (
                <Card
                  key={user.id || user._id}
                  className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-0"
                >
                  <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
                    <div className="p-5 lg:p-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                        <div className="flex items-start gap-4">
                          <Avatar
                            src={user?.avatar}
                            alt={`Photo de ${fullName}`}
                            name={fullName}
                            size="lg"
                            variant="message"
                            type="user"
                          />
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="break-words text-xl font-semibold text-white">{fullName}</h4>
                              <Badge className={scoreToneClassName(item.score)}>{item.score}%</Badge>
                            </div>
                            <p className="break-words text-sm text-stone-400">{user?.email || "Email non renseigne"}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={matchCheckBadgeClassName(item.checks.purpose)}>
                                {item.checks.purpose ? "Objectif compatible" : "Objectif different"}
                              </Badge>
                              <Badge className={matchCheckBadgeClassName(item.checks.type)}>
                                {item.checks.type ? "Type compatible" : "Type hors cible"}
                              </Badge>
                              <Badge className={matchCheckBadgeClassName(item.checks.budget)}>
                                {item.checks.budget ? "Budget compatible" : "Budget depasse"}
                              </Badge>
                              <Badge className={matchCheckBadgeClassName(item.checks.location)}>
                                {item.distanceKm != null ? `${item.distanceKm} km` : "Sans distance calculee"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Objectif</p>
                            <p className="mt-2 text-sm font-medium text-white">{summary.purposeLabel}</p>
                          </div>
                          <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Budget reel</p>
                            <p className="mt-2 text-sm font-medium text-white">{summary.budgetLabel}</p>
                          </div>
                          <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Types recherches</p>
                            <p className="mt-2 break-words text-sm font-medium text-white">{summary.propertyTypeLabels.join(", ") || "Tous types"}</p>
                          </div>
                          <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Rayon</p>
                            <p className="mt-2 text-sm font-medium text-white">{summary.radiusLabel}</p>
                          </div>
                          <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Localisation</p>
                            <p className="mt-2 text-sm font-medium text-white">{summary.hasLocation ? "Activee" : "Inactive"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-stone-950/45 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">Criteres de matching</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.reasons.map((reason) => (
                            <span
                              key={`${user.id || user._id}-${reason}`}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-200"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 bg-black/15 p-5 lg:border-l lg:border-t-0 lg:p-6">
                      <div className="flex h-full flex-col justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/80">Action</p>
                          <p className="mt-2 text-sm leading-6 text-stone-400">
                            Ouvrez directement une conversation contextualisee avec ce bien pour lancer l&apos;echange.
                          </p>
                        </div>
                        <Button type="button" className="w-full px-4 py-3" onClick={() => handleDiscuss(user)}>
                          Discuter
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ModalLayout>
  );
};

export default ModalMatchingUser;
