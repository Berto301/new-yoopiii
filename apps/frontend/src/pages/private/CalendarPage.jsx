import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { selectCurrentUser } from "../../app/store/session.store.js";
import { ModalManageAppointment } from "../../features/chat/ModalManageAppointment.jsx";
import { APPOINTMENT_STATUS, formatParticipantName, isAgentRole } from "../../features/chat/appointment.utils.js";
import { getConversationMessages, getConversations } from "../../features/chat/services/chat.service.js";

const locales = { fr };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: fr }),
  getDay,
  locales
});

const calendarMessages = {
  today: "Aujourd'hui",
  previous: "Precedent",
  next: "Suivant",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  date: "Date",
  time: "Heure",
  event: "Rendez-vous",
  noEventsInRange: "Aucun rendez-vous sur cette periode",
  showMore: (total) => `+${total} de plus`
};

const parseAppointmentDateTime = (date, time) => {
  if (!date || !time) {
    return null;
  }

  const parsedValue = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
};

const resolveAppointmentParticipants = (appointment, conversation, currentUser) => {
  const participants = conversation?.participantProfiles || [];
  const currentParticipant = participants.find((participant) => participant.id === currentUser?.id) || currentUser || null;
  const agent = participants.find((participant) => participant.id === appointment?.agentId)
    || participants.find((participant) => isAgentRole(participant.role))
    || (isAgentRole(currentUser?.role) ? currentUser : null);
  const client = participants.find((participant) => participant.id === appointment?.clientId)
    || participants.find((participant) => participant.id !== agent?.id)
    || (!isAgentRole(currentUser?.role) ? currentUser : null);

  return {
    currentParticipant,
    agent,
    client
  };
};

const buildCalendarEvent = (message, conversation, currentUser) => {
  if (!message?.appointment) {
    return null;
  }

  const start = parseAppointmentDateTime(message.appointment.date, message.appointment.startTime);
  const end = parseAppointmentDateTime(message.appointment.date, message.appointment.endTime);

  if (!start || !end) {
    return null;
  }

  const { currentParticipant, agent, client } = resolveAppointmentParticipants(message.appointment, conversation, currentUser);

  return {
    id: message.id,
    title: message.appointment.propertyTitle || "Rendez-vous",
    start,
    end,
    allDay: false,
    appointment: message.appointment,
    conversation,
    message,
    currentParticipant,
    agent,
    client
  };
};

const getStatusTone = (status) => {
  if (status === "closed_won") {
    return "border-emerald-400/25 bg-emerald-400/10 text-white";
  }

  if (status === "cancelled") {
    return "border-red-400/25 bg-red-400/10 text-red-100";
  }

  return "border-amber-400/25 bg-amber-400/10 text-amber-100";
};

const StatCard = ({ label, value, toneClassName, description }) => (
  <Card className="relative overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className={`text-3xl font-semibold md:text-4xl ${toneClassName}`}>{value}</p>
      <p className="text-sm leading-6 text-stone-300">{description}</p>
    </div>
  </Card>
);

const UpcomingAppointmentCard = ({ event, onOpen }) => {
  const otherParticipant = event.currentParticipant?.id === event.agent?.id ? event.client : event.agent;
  const participantName = formatParticipantName(otherParticipant) || "Participant";
  const appointmentStatus = APPOINTMENT_STATUS[event.appointment.status] || "En attente";

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="w-full rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{format(event.start, "dd MMM yyyy", { locale: fr })}</p>
          <h4 className="mt-2 text-base font-semibold text-white">{event.title}</h4>
        </div>
        <Badge className={getStatusTone(event.appointment.status)}>{appointmentStatus}</Badge>
      </div>
      <div className="mt-4 space-y-2 text-sm text-stone-300">
        <p>{format(event.start, "HH:mm", { locale: fr })} - {format(event.end, "HH:mm", { locale: fr })}</p>
        <p>{participantName}</p>
      </div>
    </button>
  );
};

export const CalendarPage = () => {
  const currentUser = useSelector(selectCurrentUser);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const conversationsQuery = useQuery({
    queryKey: ["calendar-conversations", currentUser?.id],
    queryFn: getConversations,
    enabled: Boolean(currentUser)
  });

  const conversationIds = useMemo(
    () => (conversationsQuery.data || []).map((conversation) => conversation.id),
    [conversationsQuery.data]
  );

  const appointmentQueries = useQueries({
    queries: conversationIds.map((conversationId) => ({
      queryKey: ["calendar-appointments", conversationId],
      queryFn: () => getConversationMessages({ conversationId, page: 1, limit: 100 }),
      enabled: Boolean(conversationId)
    }))
  });

  const isLoadingAppointments = conversationsQuery.isLoading || appointmentQueries.some((query) => query.isLoading);
  const hasAppointmentError = conversationsQuery.isError || appointmentQueries.some((query) => query.isError);

  const events = useMemo(() => {
    const conversations = conversationsQuery.data || [];

    return appointmentQueries.flatMap((query, index) => {
      const conversation = conversations[index];
      const items = query.data?.items || [];

      return items
        .filter((message) => message.messageType === "appointment" && message.appointment)
        .map((message) => buildCalendarEvent(message, conversation, currentUser))
        .filter(Boolean);
    });
  }, [appointmentQueries, conversationsQuery.data, currentUser]);

  const propertyOptions = useMemo(() => {
    if (!selectedEvent?.appointment?.propertyId) {
      return [];
    }

    return [{
      value: selectedEvent.appointment.propertyId,
      label: selectedEvent.appointment.propertyTitle || "Bien selectionne",
      purpose: selectedEvent.appointment.propertyPurpose || null
    }];
  }, [selectedEvent]);

  const summary = useMemo(() => ({
    total: events.length,
    pending: events.filter((event) => event.appointment.status === "pending").length,
    closedWon: events.filter((event) => event.appointment.status === "closed_won").length,
    today: events.filter((event) => format(event.start, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length
  }), [events]);

  const upcomingEvents = useMemo(
    () => [...events].filter((event) => event.end >= new Date()).sort((a, b) => a.start - b.start).slice(0, 6),
    [events]
  );

  return (
    <>
      <section className="space-y-8">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-0">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <SectionTitle
                eyebrow="Calendrier"
                title="Rendez-vous planifies"
                description="Retrouvez les rendez-vous issus de vos conversations, visualisez les disponibilites d'un coup d'oeil et ouvrez chaque fiche en lecture seule en un clic."
              />
              <div className="flex flex-wrap gap-3">
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.24em] text-stone-300 backdrop-blur">
                  {events.length} rendez-vous synchronises
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.24em] text-stone-300 backdrop-blur">
                  Vue mensuelle, hebdo, jour et agenda
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Total" value={summary.total} toneClassName="text-white" description="Volume complet des rendez-vous relies aux conversations." />
              <StatCard label="Aujourd'hui" value={summary.today} toneClassName="text-sky-100" description="Rendez-vous prevus sur la journee en cours." />
              <StatCard label="En attente" value={summary.pending} toneClassName="text-amber-200" description="Points de contact encore ouverts ou a confirmer." />
              <StatCard label="Conclu" value={summary.closedWon} toneClassName="text-emerald-200" description="Opportunites deja finalisees avec succes." />
            </div>
          </div>
        </Card>

        {isLoadingAppointments ? (
          <Card className="border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
            <p className="text-sm text-stone-300">Chargement du calendrier...</p>
          </Card>
        ) : hasAppointmentError ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <p className="text-sm text-red-200">Impossible de charger les rendez-vous pour le calendrier.</p>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-0">
              <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Vue planning</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Calendrier centralise</h3>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-stone-400">
                  Utilisez les vues mois, semaine, jour ou agenda pour suivre l'activite et ouvrir rapidement chaque rendez-vous.
                </p>
              </div>
              <div className="calendar-shell p-4 md:p-6">
                <Calendar
                  localizer={localizer}
                  events={events}
                  defaultView={Views.MONTH}
                  views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                  messages={calendarMessages}
                  popup
                  style={{ height: 760 }}
                  onSelectEvent={(event) => setSelectedEvent(event)}
                  eventPropGetter={(event) => ({
                    className: event.appointment.status === "closed_won"
                      ? "calendar-event calendar-event-success"
                      : "calendar-event"
                  })}
                  tooltipAccessor={(event) => {
                    const otherParticipant = event.currentParticipant?.id === event.agent?.id ? event.client : event.agent;
                    return `${event.title} - ${formatParticipantName(otherParticipant)} - ${APPOINTMENT_STATUS[event.appointment.status] || "En attente"}`;
                  }}
                />
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Actions rapides</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Navigation du planning</h3>
                  </div>
                  <Badge className="border-white/10 bg-white/5 text-stone-200">Lecture seule</Badge>
                </div>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1.4rem] border border-white/10 bg-stone-950/60 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Conseil</p>
                    <p className="mt-2 text-sm leading-6 text-stone-300">Cliquez sur un rendez-vous pour ouvrir sa fiche detaillee sans quitter la vue calendrier.</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-stone-950/60 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Vues</p>
                    <p className="mt-2 text-sm leading-6 text-stone-300">Le bandeau du calendrier permet de passer rapidement entre mois, semaine, jour et agenda.</p>
                  </div>
                </div>
              </Card>

              <Card className="border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">A venir</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Prochains rendez-vous</h3>
                  </div>
                  <Badge className="border-white/10 bg-white/5 text-stone-200">{upcomingEvents.length}</Badge>
                </div>

                <div className="mt-5 space-y-3">
                  {upcomingEvents.length ? upcomingEvents.map((event) => (
                    <UpcomingAppointmentCard key={event.id} event={event} onOpen={setSelectedEvent} />
                  )) : (
                    <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-black/10 px-4 py-5 text-sm leading-6 text-stone-400">
                      Aucun rendez-vous a venir pour le moment.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </section>

      <ModalManageAppointment
        open={Boolean(selectedEvent)}
        mode="edit"
        readOnly
        appointment={selectedEvent?.appointment || null}
        propertyOptions={propertyOptions}
        currentUser={selectedEvent?.currentParticipant || currentUser}
        agent={selectedEvent?.agent || null}
        client={selectedEvent?.client || null}
        isAgent={isAgentRole(currentUser?.role)}
        onClose={() => setSelectedEvent(null)}
        onSubmit={() => {}}
      />
    </>
  );
};

export default CalendarPage;
