import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { useBookingsWorkspace } from "../../bookings/hooks/useBookingsWorkspace.js";
import { getDiscoverableAgents, getAgencyDirectory } from "../../directory/services/directory.service.js";
import { usePropertyWorkspace } from "../../properties/hooks/usePropertyWorkspace.js";
import { DashboardEmptyState, DashboardHero, DashboardLoadingState, DashboardPanel, DashboardStatsGrid } from "../components/DashboardBlocks.jsx";
import { getConversationCounterpart, getDisplayName, formatCompactNumber, formatCurrency, formatDateTime, sortByNewest } from "../dashboard.utils.js";
import { useDashboardMessaging } from "../hooks/useDashboardMessaging.js";

const sortAgencies = (items = []) =>
  [...items].sort((left, right) => {
    const rightScore = (right.ratingAverage || 0) * 10 + (right.activeAgentsCount || 0) + (right.managedPropertiesCount || 0);
    const leftScore = (left.ratingAverage || 0) * 10 + (left.activeAgentsCount || 0) + (left.managedPropertiesCount || 0);
    return rightScore - leftScore;
  });

const sortAgents = (items = []) =>
  [...items].sort((left, right) => {
    const rightScore = (right.clientRating || 0) * 10 + (right.managedPropertiesCount || 0);
    const leftScore = (left.clientRating || 0) * 10 + (left.managedPropertiesCount || 0);
    return rightScore - leftScore;
  });

export const UserDashboardOverview = () => {
  const { favoritePropertiesQuery, propertyPublicationsQuery } = usePropertyWorkspace();
  const { bookingsQuery } = useBookingsWorkspace();
  const {
    currentUser,
    unreadCountQuery,
    recentConversations,
    upcomingAppointments,
    isLoadingAppointments,
    hasAppointmentError
  } = useDashboardMessaging();

  const agenciesQuery = useQuery({
    queryKey: ["dashboard-top-agencies"],
    queryFn: () => getAgencyDirectory({ page: 1, limit: 6 }),
    enabled: Boolean(currentUser?.role === "user")
  });

  const agentsQuery = useQuery({
    queryKey: ["dashboard-top-agents"],
    queryFn: () => getDiscoverableAgents({ page: 1, limit: 6 }),
    enabled: Boolean(currentUser?.role === "user")
  });

  const topAgencies = useMemo(() => sortAgencies(agenciesQuery.data?.items || []).slice(0, 3), [agenciesQuery.data?.items]);
  const topAgents = useMemo(() => sortAgents(agentsQuery.data?.items || []).slice(0, 3), [agentsQuery.data?.items]);
  const recentPublications = useMemo(
    () => sortByNewest(propertyPublicationsQuery.data?.items || [], (property) => property.updatedAt || property.createdAt).slice(0, 4),
    [propertyPublicationsQuery.data?.items]
  );

  const stats = [
    {
      label: "Calendar",
      value: formatCompactNumber(upcomingAppointments.length),
      helpText: "Rendez-vous a venir issus de vos conversations actives."
    },
    {
      label: "Biens publies",
      value: formatCompactNumber(propertyPublicationsQuery.data?.pagination?.total ?? 0),
      helpText: "Biens actuellement visibles et reservables dans le catalogue."
    },
    {
      label: "Reservations",
      value: formatCompactNumber(bookingsQuery.data?.length ?? 0),
      helpText: "Demandes et reservations rattachees a votre espace personnel."
    },
    {
      label: "Favoris",
      value: formatCompactNumber(favoritePropertiesQuery.data?.pagination?.total ?? 0),
      helpText: "Biens suivis de pres pour vos prochaines prises de decision."
    },
    {
      label: "Messages non lus",
      value: formatCompactNumber(unreadCountQuery.data?.total ?? 0),
      helpText: "Conversations qui attendent une reponse ou un suivi."
    }
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Vue globale"
        title="Un pilotage clair de votre parcours immobilier"
        description="Retrouvez vos biens suivis, vos conversations recentes, vos prochains rendez-vous et une selection des meilleurs profils a contacter sans quitter votre dashboard."
        metrics={[
          { label: "Favoris", value: favoritePropertiesQuery.data?.pagination?.total ?? 0 },
          { label: "Reservations", value: bookingsQuery.data?.length ?? 0 },
          { label: "Messages", value: unreadCountQuery.data?.total ?? 0 }
        ]}
      />

      <DashboardStatsGrid items={stats} />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <DashboardPanel
          title="Biens publies recents"
          description="Les derniers biens actifs a consulter ou a retrouver rapidement depuis votre flux utilisateur."
          badge={`${propertyPublicationsQuery.data?.pagination?.total ?? 0} biens`}
          action={<Button as={Link} to="/dashboard/publications" variant="secondary">Voir les publications</Button>}
        >
          {propertyPublicationsQuery.isLoading ? (
            <DashboardLoadingState label="Chargement des biens publies..." />
          ) : !recentPublications.length ? (
            <DashboardEmptyState
              title="Aucun bien publie pour le moment"
              description="Les biens approuves apparaitront ici pour vous permettre de reprendre rapidement vos recherches."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recentPublications.map((property) => (
                <div key={property.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <p className="font-semibold text-white">{property.title}</p>
                  <p className="mt-1 text-sm text-stone-400">{property.address}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-amber-100">{formatCurrency(property.price, property.currency)}</span>
                    <span className="uppercase tracking-[0.18em] text-stone-500">{property.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Rendez-vous a venir"
          description="Les prochains echanges issus de votre calendrier conversationnel."
          badge={`${upcomingAppointments.length}`}
          action={<Button as={Link} to="/calendar" variant="secondary">Ouvrir le calendar</Button>}
        >
          {isLoadingAppointments ? (
            <DashboardLoadingState label="Chargement des rendez-vous..." />
          ) : hasAppointmentError ? (
            <DashboardEmptyState title="Impossible de charger le calendrier" description="Les rendez-vous n'ont pas pu etre recuperes pour le moment." />
          ) : !upcomingAppointments.length ? (
            <DashboardEmptyState
              title="Aucun rendez-vous programme"
              description="Vos prochains echanges planifies depuis la messagerie apparaitront ici automatiquement."
            />
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 4).map((appointment) => (
                <div key={appointment.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <p className="font-semibold text-white">{appointment.title}</p>
                  <p className="mt-1 text-sm text-stone-400">Avec {getDisplayName(appointment.counterpart, "agency_agent")}</p>
                  <p className="mt-3 text-sm text-amber-100">{formatDateTime(appointment.start)}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Top agences" description="Une selection des agences les plus visibles et les plus actives actuellement.">
          {agenciesQuery.isLoading ? (
            <DashboardLoadingState label="Chargement des agences..." />
          ) : !topAgencies.length ? (
            <DashboardEmptyState title="Aucune agence mise en avant" description="Les meilleures agences remonteront ici des que l'annuaire sera charge." />
          ) : (
            <div className="space-y-3">
              {topAgencies.map((agency) => (
                <div key={agency.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{agency.name}</p>
                      <p className="mt-1 text-sm text-stone-400">{agency.address || "Adresse non renseignee"}</p>
                    </div>
                    <span className="text-sm text-amber-100">{agency.ratingAverage ? `${agency.ratingAverage.toFixed(1)}/5` : "-"}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-stone-500">
                    <span>{agency.activeAgentsCount || 0} agents</span>
                    <span>{agency.managedPropertiesCount || 0} biens</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Top agents" description="Les profils agent les plus actifs et les mieux notes a contacter rapidement.">
          {agentsQuery.isLoading ? (
            <DashboardLoadingState label="Chargement des agents..." />
          ) : !topAgents.length ? (
            <DashboardEmptyState title="Aucun agent disponible" description="Les meilleurs profils remontes depuis l'annuaire apparaitront ici." />
          ) : (
            <div className="space-y-3">
              {topAgents.map((agent) => (
                <div key={agent.userId} className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={agent.avatar} alt={`Photo de ${getDisplayName(agent, "agency_agent")}`} name={getDisplayName(agent, "agency_agent")} size="sm" variant="message" type="agent" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{getDisplayName(agent, "agency_agent")}</p>
                      <p className="truncate text-sm text-stone-400">{agent.organizationLabel}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-amber-100">{agent.clientRating ? `${agent.clientRating.toFixed(1)}/5` : "-"}</p>
                    <p className="text-stone-500">{agent.managedPropertiesCount || 0} biens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Nouveaux messages"
        description="Les conversations les plus recentes pour reprendre rapidement la main sur vos echanges en cours."
        badge={`${unreadCountQuery.data?.total ?? 0} non lus`}
        action={<Button as={Link} to="/messages" variant="secondary">Aller aux messages</Button>}
      >
        {recentConversations.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {recentConversations.map((conversation) => {
              const counterpart = getConversationCounterpart(conversation, currentUser?.id);

              return (
                <div key={conversation.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={counterpart?.avatar} alt={`Photo de ${getDisplayName(counterpart, "agency_agent")}`} name={getDisplayName(counterpart, "agency_agent")} size="sm" variant="message" type="agent" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{getDisplayName(counterpart, "agency_agent")}</p>
                      <p className="truncate text-sm text-stone-400">{conversation.lastMessagePreview || "Conversation demarree"}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">{formatDateTime(conversation.lastMessageAt || conversation.updatedAt)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <DashboardEmptyState title="Aucune conversation recente" description="Vos echanges demarres avec les agences et les agents apparaitront ici." />
        )}
      </DashboardPanel>
    </div>
  );
};
