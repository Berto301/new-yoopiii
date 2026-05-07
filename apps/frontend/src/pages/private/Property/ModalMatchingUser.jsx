import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
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
    : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]";

const InfoTile = ({ label, value }) => (
  <div className="min-w-0 rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4">
    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
    <p className="mt-2 break-words text-sm font-medium text-[var(--foreground)]">{value}</p>
  </div>
);

export const ModalMatchingUser = ({
  open,
  property,
  onClose
}) => {
  const navigate = useNavigate();
  const { t } = useUserPreferences();
  const [search, setSearch] = useState("");
  const [minimumScore, setMinimumScore] = useState(SMART_MATCHING_SCORE_OPTIONS[1]);
  const [matchStatus, setMatchStatus] = useState(MATCH_STATUS_OPTIONS[0]);
  const usersQuery = useQuery({
    queryKey: ["smart-matching-users", property?.id],
    queryFn: getUsers,
    enabled: Boolean(open && property?.id)
  });

  const localizedMatchStatusOptions = useMemo(() => [
    { label: t("private", "matching.filters.all", "Tous les profils"), value: "all" },
    { label: t("private", "matching.filters.strong", "Matches forts"), value: "strong" },
    { label: t("private", "matching.filters.partial", "Matches partiels"), value: "partial" }
  ], [t]);

  const effectiveMatchStatus = localizedMatchStatusOptions.find((option) => option.value === matchStatus?.value) || localizedMatchStatusOptions[0];

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
      title={t("private", "matching.title", "Matching intelligent")}
      onClose={onClose}
      footerContent={(
        <div className="flex justify-end border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" className="px-5 py-3" onClick={onClose}>
            {t("private", "matching.close", "Fermer")}
          </Button>
        </div>
      )}
      panelClassName="max-h-[92vh] max-w-[96vw] overflow-y-auto xl:max-w-[112rem]"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_22%),linear-gradient(135deg,var(--surface-soft),transparent)]">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">{t("private", "matching.eyebrow", "Prospection assistee")}</p>
              <h3 className="text-2xl font-semibold text-[var(--foreground)]">{t("private", "matching.heading", "Utilisateurs potentiellement interesses par ce bien")}</h3>
              <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {t("private", "matching.description", "Le scoring actuel repose sur des regles explicites et maintenables. La structure est prete pour accueillir plus tard une couche IA sans casser l'experience existante.")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-[var(--border)] bg-[var(--surface-soft)] p-4 shadow-none">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "matching.property", "Bien")}</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{property?.title || t("private", "matching.selectedProperty", "Bien selectionne")}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{property?.address || t("private", "matching.addressMissing", "Adresse non renseignee")}</p>
              </Card>
              <Card className="border-[var(--border)] bg-[var(--surface-soft)] p-4 shadow-none">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("private", "matching.filteredCandidates", "Candidats filtres")}</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{matchItems.length}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{t("private", "matching.activeProfiles", "Profils actifs avec matching intelligent active.")}</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_260px_260px]">
            <Input
              label={t("private", "matching.search", "Recherche")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("private", "matching.searchPlaceholder", "Nom ou email")}
            />
            <BaseListBox
              label={t("private", "matching.minimumScore", "Score minimum")}
              options={SMART_MATCHING_SCORE_OPTIONS}
              value={minimumScore}
              onChange={setMinimumScore}
            />
            <BaseListBox
              label={t("private", "matching.matchType", "Type de match")}
              options={localizedMatchStatusOptions}
              value={effectiveMatchStatus}
              onChange={setMatchStatus}
            />
          </div>
        </section>

        {usersQuery.isLoading ? (
          <Card className="border-[var(--border)] bg-[var(--surface-soft)]">
            <p className="text-sm text-[var(--muted)]">{t("private", "matching.loading", "Chargement des profils a analyser...")}</p>
          </Card>
        ) : usersQuery.isError ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <p className="text-sm text-red-300">{t("private", "matching.error", "Impossible de charger les profils pour le matching.")}</p>
          </Card>
        ) : !matchItems.length ? (
          <Card className="border-dashed border-[var(--border)] bg-[linear-gradient(135deg,var(--surface-soft),transparent)] text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">{t("private", "matching.emptyTitle", "Aucun utilisateur ne correspond aux filtres actuels.")}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t("private", "matching.emptyDescription", "Essayez d'abaisser le score minimum ou d'enlever le filtre de type de match.")}</p>
          </Card>
        ) : (
          <div className="grid gap-4 2xl:grid-cols-2">
            {matchItems.map((item) => {
              const user = item.user;
              const userId = user.id || user._id;
              const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Utilisateur";
              const summary = formatSmartMatchingSummary(item.matching);

              return (
                <Card
                  key={userId}
                  className="overflow-hidden border-[var(--border)] bg-[linear-gradient(135deg,var(--surface-soft),transparent)] p-0"
                >
                  <div className="grid h-full gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
                    <div className="min-w-0 p-5 lg:p-6">
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <Avatar
                            src={user?.avatar}
                            alt={`Photo de ${fullName}`}
                            name={fullName}
                            size="lg"
                            variant="message"
                            type="user"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="break-words text-xl font-semibold text-[var(--foreground)]">{fullName}</h4>
                              <Badge className={scoreToneClassName(item.score)}>{item.score}%</Badge>
                            </div>
                            <p className="break-words text-sm text-[var(--muted)]">{user?.email || t("private", "matching.emailMissing", "Email non renseigne")}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge className={matchCheckBadgeClassName(item.checks.purpose)}>
                                {item.checks.purpose ? t("private", "matching.badges.purposeOk", "Objectif compatible") : t("private", "matching.badges.purposeNo", "Objectif different")}
                              </Badge>
                              <Badge className={matchCheckBadgeClassName(item.checks.type)}>
                                {item.checks.type ? t("private", "matching.badges.typeOk", "Type compatible") : t("private", "matching.badges.typeNo", "Type hors cible")}
                              </Badge>
                              <Badge className={matchCheckBadgeClassName(item.checks.budget)}>
                                {item.checks.budget ? t("private", "matching.badges.budgetOk", "Budget compatible") : t("private", "matching.badges.budgetNo", "Budget depasse")}
                              </Badge>
                              <Badge className={matchCheckBadgeClassName(item.checks.location)}>
                                {item.distanceKm != null ? `${item.distanceKm} km` : t("private", "matching.badges.noDistance", "Sans distance calculee")}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoTile label={t("private", "matching.summary.purpose", "Objectif")} value={summary.purposeLabel} />
                          <InfoTile label={t("private", "matching.summary.budget", "Budget reel")} value={summary.budgetLabel} />
                          <InfoTile label={t("private", "matching.summary.types", "Types recherches")} value={summary.propertyTypeLabels.join(", ") || t("private", "matching.summary.allTypes", "Tous types")} />
                          <InfoTile label={t("private", "matching.summary.radius", "Rayon")} value={summary.radiusLabel} />
                          <InfoTile label={t("private", "matching.summary.location", "Localisation")} value={summary.hasLocation ? t("private", "matching.summary.enabled", "Activee") : t("private", "matching.summary.disabled", "Inactive")} />
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "matching.criteria", "Criteres de matching")}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.reasons.map((reason) => (
                            <span
                              key={`${userId}-${reason}`}
                              className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--foreground)]"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] bg-[var(--surface-soft)] p-5 xl:border-l xl:border-t-0 xl:p-6">
                      <div className="flex h-full min-h-[220px] flex-col justify-between gap-5">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">{t("private", "matching.action", "Action")}</p>
                          <h5 className="text-lg font-semibold text-[var(--foreground)]">{t("private", "matching.actionTitle", "Conversation contextualisee")}</h5>
                          <p className="text-sm leading-6 text-[var(--muted)]">
                            {t("private", "matching.actionDescription", "Ouvrez directement une conversation contextualisee avec ce bien pour lancer l'echange.")}
                          </p>
                        </div>
                        <Button type="button" className="w-full px-4 py-3" onClick={() => handleDiscuss(user)}>
                          {t("private", "matching.discuss", "Discuter")}
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
