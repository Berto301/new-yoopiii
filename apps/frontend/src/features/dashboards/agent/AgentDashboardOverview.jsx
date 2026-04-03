import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/Button.jsx";
import { useBookingsWorkspace } from "../../bookings/hooks/useBookingsWorkspace.js";
import { usePropertyWorkspace } from "../../properties/hooks/usePropertyWorkspace.js";
import { DashboardEmptyState, DashboardHero, DashboardLoadingState, DashboardPanel, DashboardStatsGrid } from "../components/DashboardBlocks.jsx";
import { formatCompactNumber, formatDateTime, getConversationCounterpart, getDisplayName, sortByNewest } from "../dashboard.utils.js";
import { useDashboardMessaging } from "../hooks/useDashboardMessaging.js";
import { Avatar } from "../../../components/profile/Avatar.jsx";

export const AgentDashboardOverview = () => {
  const { managedPropertiesQuery } = usePropertyWorkspace();
  const { bookingsQuery } = useBookingsWorkspace();
  const {
    currentUser,
    unreadCountQuery,
    recentConversations,
    upcomingAppointments,
    isLoadingAppointments,
    hasAppointmentError
  } = useDashboardMessaging();

  const managedItems = managedPropertiesQuery.data?.items || [];
  const recentProperties = useMemo(
    () => sortByNewest(managedItems, (property) => property.updatedAt || property.createdAt).slice(0, 5),
    [managedItems]
  );
  const recentActivities = useMemo(
    () => sortByNewest(managedItems, (property) => property.updatedAt || property.createdAt).slice(0, 3),
    [managedItems]
  );

  const stats = [
    {
      label: "Biens",
      value: formatCompactNumber(managedPropertiesQuery.data?.summary?.total ?? 0),
      helpText: "Biens actuellement geres dans votre portefeuille commercial."
    },
    {
      label: "Calendar",
      value: formatCompactNumber(upcomingAppointments.length),
      helpText: "Rendez-vous planifies via vos conversations et suivis."
    },
    {
      label: "Nouveaux messages",
      value: formatCompactNumber(unreadCountQuery.data?.total ?? 0),
      helpText: "Messages non lus qui attendent une action de votre part."
    },
    {
      label: "Reservations",
      value: formatCompactNumber(bookingsQuery.data?.length ?? 0),
      helpText: "Reservations et demandes rattachees a vos biens ou a vos conversations."
    }
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Pilotage agent"
        title="Une vue commerciale nette sur vos priorites"
        description="Suivez vos biens actifs, les derniers mouvements de portefeuille, vos conversations recentes et les rendez-vous a venir dans une interface plus directe et plus visuelle."
        metrics={[
          { label: "Publies", value: managedPropertiesQuery.data?.summary?.published ?? 0 },
          { label: "En attente", value: managedPropertiesQuery.data?.summary?.pendingApproval ?? 0 },
          { label: "Messages", value: unreadCountQuery.data?.total ?? 0 }
        ]}
      />

      <DashboardStatsGrid items={stats} />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <DashboardPanel
          title="Biens sous pilotage"
          description="Vos biens les plus recents pour reprendre rapidement sur une action de publication, de suivi ou d'archivage."
          badge={`${managedPropertiesQuery.data?.summary?.total ?? 0} biens`}
          action={<Button as={Link} to="/dashboard/properties" variant="secondary">Gerer les biens</Button>}
        >
          {managedPropertiesQuery.isLoading ? (
            <DashboardLoadingState label="Chargement des biens..." />
          ) : !recentProperties.length ? (
            <DashboardEmptyState title="Aucun bien a piloter" description="Ajoutez ou activez vos biens pour voir ici les derniers mouvements de votre portefeuille." />
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
          title="Rendez-vous"
          description="Les prochaines rencontres commerciales planifiees dans votre pipeline."
          badge={`${upcomingAppointments.length}`}
          action={<Button as={Link} to="/calendar" variant="secondary">Voir le calendar</Button>}
        >
          {isLoadingAppointments ? (
            <DashboardLoadingState label="Chargement des rendez-vous..." />
          ) : hasAppointmentError ? (
            <DashboardEmptyState title="Calendrier indisponible" description="Les rendez-vous n'ont pas pu etre recuperes pour le moment." />
          ) : !upcomingAppointments.length ? (
            <DashboardEmptyState title="Aucun rendez-vous programme" description="Les rendez-vous issus de vos conversations apparaitront ici des qu'ils seront planifies." />
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
        <DashboardPanel title="3 dernieres activites" description="Les derniers biens modifies, republies ou mis a jour dans votre espace agent.">
          {managedPropertiesQuery.isLoading ? (
            <DashboardLoadingState label="Chargement des activites..." />
          ) : !recentActivities.length ? (
            <DashboardEmptyState title="Aucune activite recente" description="Vos actions sur les biens remonteront ici pour garder un historique rapide." />
          ) : (
            <div className="space-y-3">
              {recentActivities.map((property) => (
                <div key={property.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/50 p-4">
                  <p className="font-semibold text-white">{property.title}</p>
                  <p className="mt-1 text-sm text-stone-400">Statut {property.status} / publication {property.publicationStatus}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">{formatDateTime(property.updatedAt || property.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Nouveaux messages"
          description="Les echanges recents avec vos prospects et clients a traiter en priorite."
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
            <DashboardEmptyState title="Aucune conversation recente" description="Vos derniers echanges remonteront ici automatiquement." />
          )}
        </DashboardPanel>
      </div>
    </div>
  );
};
