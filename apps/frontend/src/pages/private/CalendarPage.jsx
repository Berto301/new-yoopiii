import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";
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
    closedWon: events.filter((event) => event.appointment.status === "closed_won").length
  }), [events]);

  return (
    <>
      <section className="space-y-8">
        <SectionTitle
          eyebrow="Calendrier"
          title="Rendez-vous planifies"
          description="Retrouvez les rendez-vous issus de vos conversations, visualisez-les dans le calendrier et ouvrez leur fiche en lecture seule en un clic."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Total</p>
            <p className="mt-3 text-3xl font-semibold text-white">{summary.total}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">En attente</p>
            <p className="mt-3 text-3xl font-semibold text-amber-200">{summary.pending}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Conclu</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-200">{summary.closedWon}</p>
          </Card>
        </div>

        {isLoadingAppointments ? (
          <Card><p className="text-sm text-stone-300">Chargement du calendrier...</p></Card>
        ) : hasAppointmentError ? (
          <Card><p className="text-sm text-red-300">Impossible de charger les rendez-vous pour le calendrier.</p></Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="calendar-shell p-4 md:p-6">
              <Calendar
                localizer={localizer}
                events={events}
                defaultView={Views.MONTH}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                messages={calendarMessages}
                popup
                style={{ height: 720 }}
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
