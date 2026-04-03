import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../../../components/profile/Avatar.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { useAgencyDashboard } from "../../agency/hooks/useAgencyDashboard.js";
import { DashboardEmptyState, DashboardHero, DashboardLoadingState, DashboardPanel, DashboardStatsGrid } from "../components/DashboardBlocks.jsx";
import { formatCompactNumber, formatCurrency, formatDateTime, getConversationCounterpart, getDisplayName, sortByNewest } from "../dashboard.utils.js";
import { useDashboardMessaging } from "../hooks/useDashboardMessaging.js";

export const AgencyDashboardOverview = () => {
  const { summaryQuery, membersQuery, eventsQuery, propertiesQuery } = useAgencyDashboard();
  const {
    currentUser,
    unreadCountQuery,
    recentConversations,
    upcomingAppointments,
    isLoadingAppointments,
    hasAppointmentError
  } = useDashboardMessaging();

  const summary = summaryQuery.data;
  const recentProperties = useMemo(
    () => sortByNewest(propertiesQuery.data?.items || [], (property) => property.updatedAt || property.createdAt).slice(0, 5),
    [propertiesQuery.data?.items]
  );
  const recentAgentActivities = useMemo(
    () => sortByNewest(propertiesQuery.data?.items || [], (property) => property.updatedAt || property.createdAt).slice(0, 3),
    [propertiesQuery.data?.items]
  );

  if (summaryQuery.isLoading) {
    return <DashboardLoadingState label="Chargement du dashboard agence..." />;
  }

  if (summaryQuery.isError) {
    return <DashboardEmptyState title="Dashboard indisponible" description="Le resume agence n'a pas pu etre charge pour le moment." />;
  }

  const stats = [
    {
      label: "Biens",
      value: formatCompactNumber(propertiesQuery.data?.summary?.total ?? 0),
      helpText: "Biens actuellement geres par votre structure."
    },
    {
      label: "Calendar",
      value: formatCompactNumber(eventsQuery.data?.pagination?.total ?? 0),
      helpText: "Evenements agence planifies sur la periode en cours."
    },
    {
      label: "Nouveaux messages",
      value: formatCompactNumber(unreadCountQuery.data?.total ?? 0),
      helpText: "Messages non lus du compte connecte dans l'espace agence."
    },
    {
      label: "Rendez-vous",
      value: formatCompactNumber(upcomingAppointments.length),
      helpText: "Rendez-vous a venir issus des conversations de suivi."
    },
    {
      label: "Agents actifs",
      value: formatCompactNumber(summary?.activeAgents ?? 0),
      helpText: "Equipe active mobilisee dans le pilotage quotidien."
    }
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Supervision agence"
        title="Une lecture plus nette de l'activite de votre structure"
        description="Visualisez les biens sous gestion, l'activite recente des agents, les evenements planifies et les conversations a reprendre dans un dashboard plus decisionnel."
        metrics={[
          { label: "Biens publies", value: propertiesQuery.data?.summary?.published ?? 0 },
          { label: "Depenses", value: formatCurrency(summary?.currentMonthExpensesTotal ?? 0) },
          { label: "Equipe", value: membersQuery.data?.length ?? 0 }
        ]}
      />

      <DashboardStatsGrid items={stats} />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <DashboardPanel
          title="Biens et pipeline"
          description="Les biens les plus recents ou les plus mouvants de l'agence pour suivre rapidement l'etat du portefeuille."
          badge={`${propertiesQuery.data?.summary?.published ?? 0} publies`}
          action={<Button as={Link} to="/dashboard/properties" variant="secondary">Voir les biens</Button>}
        >
          {propertiesQuery.isLoading ? (
            <DashboardLoadingState label="Chargement du pipeline biens..." />
          ) : !recentProperties.length ? (
            <DashboardEmptyState title="Aucun bien a afficher" description="Les biens rattaches a l'agence apparaitront ici des qu'ils seront crees ou mis a jour." />
          ) : (
            <div className="space-y-3">
              {recentProperties.map((property) => (
                <div key={property.id} className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{property.title}</p>
                    <p className="mt-1 text-sm text-stone-400">{property.address}</p>
                  </div>
                  <div className="text-sm md:text-right">
                    <p className="uppercase tracking-[0.18em] text-amber-100">{property.publicationStatus}</p>
                    <p className="mt-1 text-stone-500">Maj {formatDateTime(property.updatedAt || property.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Rendez-vous a venir"
          description="Les prochaines rencontres a anticiper depuis les conversations de l'equipe."
          badge={`${upcomingAppointments.length}`}
          action={<Button as={Link} to="/calendar" variant="secondary">Ouvrir le calendar</Button>}
        >
          {isLoadingAppointments ? (
            <DashboardLoadingState label="Chargement des rendez-vous..." />
          ) : hasAppointmentError ? (
            <DashboardEmptyState title="Rendez-vous indisponibles" description="Le calendrier conversationnel n'a pas pu etre charge." />
          ) : !upcomingAppointments.length ? (
            <DashboardEmptyState title="Aucun rendez-vous programme" description="Les rendez-vous remontes depuis les conversations apparaitront ici automatiquement." />
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 4).map((appointment) => (
                <div key={appointment.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <p className="font-semibold text-white">{appointment.propertyTitle}</p>
                  <p className="mt-1 text-sm text-stone-400">Avec {getDisplayName(appointment.counterpart, "user")}</p>
                  <p className="mt-3 text-sm text-amber-100">{formatDateTime(appointment.start)}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="3 dernieres activites d'agents" description="Les derniers mouvements identifies sur les biens de l'agence avec le collaborateur associe lorsqu'il est renseigne.">
          {propertiesQuery.isLoading ? (
            <DashboardLoadingState label="Chargement des activites agents..." />
          ) : !recentAgentActivities.length ? (
            <DashboardEmptyState title="Aucune activite agent recente" description="Les mises a jour de biens et mouvements d'equipe remonteront ici." />
          ) : (
            <div className="space-y-3">
              {recentAgentActivities.map((property) => (
                <div key={property.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{property.agentName || "Equipe agence"}</p>
                      <p className="mt-1 text-sm text-stone-400">{property.title}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-stone-500">{property.status}</span>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">{formatDateTime(property.updatedAt || property.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Nouveaux messages"
          description="Les conversations recentes a suivre par le compte connecte dans le contexte agence."
          badge={`${unreadCountQuery.data?.total ?? 0} non lus`}
          action={<Button as={Link} to="/messages" variant="secondary">Ouvrir la messagerie</Button>}
        >
          {recentConversations.length ? (
            <div className="space-y-3">
              {recentConversations.map((conversation) => {
                const counterpart = getConversationCounterpart(conversation, currentUser?.id);

                return (
                  <div key={conversation.id} className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                    <Avatar src={counterpart?.avatar} alt={`Photo de ${getDisplayName(counterpart, "user")}`} name={getDisplayName(counterpart, "user")} size="sm" variant="message" type="user" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{getDisplayName(counterpart, "user")}</p>
                      <p className="truncate text-sm text-stone-400">{conversation.lastMessagePreview || "Conversation demarree"}</p>
                    </div>
                    <p className="shrink-0 text-xs uppercase tracking-[0.18em] text-stone-500">{formatDateTime(conversation.lastMessageAt || conversation.updatedAt)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <DashboardEmptyState title="Aucune conversation recente" description="Les echanges ouverts depuis l'espace agence apparaitront ici." />
          )}
        </DashboardPanel>
      </div>
    </div>
  );
};
