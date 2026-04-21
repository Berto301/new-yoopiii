import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { ModalManageAppointment } from "../../../features/chat/ModalManageAppointment.jsx";
import { APPOINTMENT_STATUS, formatParticipantName, isAgentRole } from "../../../features/chat/appointment.utils.js";
import { getConversationMessages, getConversations } from "../../../features/chat/services/chat.service.js";
import { useOwnerWorkspace } from "../../../features/owner/hooks/useOwnerWorkspace.js";
import { selectCurrentUser } from "../../../app/store/session.store.js";

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

const getStatusTone = (status) => {
  if (status === "closed_won") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "cancelled") {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }

  if (status === "confirmed") {
    return "border-sky-400/30 bg-sky-500/10 text-sky-100";
  }

  return "border-amber-400/30 bg-amber-500/10 text-amber-100";
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
    || null;
  const client = participants.find((participant) => participant.id === appointment?.clientId)
    || participants.find((participant) => participant.id !== agent?.id)
    || null;

  return {
    currentParticipant,
    agent,
    client
  };
};

const buildOwnerCalendarEvent = ({ message, conversation, currentUser }) => {
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

export const OwnerCalendarPage = () => {
  const currentUser = useSelector(selectCurrentUser);
  const { managedPropertiesQuery } = useOwnerWorkspace();
  const [selectedEvent, setSelectedEvent] = useState(null);

  const conversationsQuery = useQuery({
    queryKey: ["owner-calendar-conversations", currentUser?.id],
    queryFn: getConversations,
    enabled: Boolean(currentUser?.id)
  });

  const managedPropertyIds = useMemo(
    () => new Set((managedPropertiesQuery.data || []).map((property) => String(property.id))),
    [managedPropertiesQuery.data]
  );

  const conversationIds = useMemo(
    () => (conversationsQuery.data || []).map((conversation) => conversation.id),
    [conversationsQuery.data]
  );

  const appointmentQueries = useQueries({
    queries: conversationIds.map((conversationId) => ({
      queryKey: ["owner-calendar-appointments", conversationId],
      queryFn: () => getConversationMessages({ conversationId, page: 1, limit: 100 }),
      enabled: Boolean(conversationId)
    }))
  });

  const isLoadingAppointments =
    managedPropertiesQuery.isLoading || conversationsQuery.isLoading || appointmentQueries.some((query) => query.isLoading);
  const hasAppointmentError =
    managedPropertiesQuery.isError || conversationsQuery.isError || appointmentQueries.some((query) => query.isError);

  const events = useMemo(() => {
    const conversations = conversationsQuery.data || [];

    return appointmentQueries.flatMap((query, index) => {
      const conversation = conversations[index];
      const items = query.data?.items || [];

      return items
        .filter((message) => {
          if (message.messageType !== "appointment" || !message.appointment) {
            return false;
          }

          return managedPropertyIds.has(String(message.appointment.propertyId || ""));
        })
        .map((message) => buildOwnerCalendarEvent({
          message,
          conversation,
          currentUser
        }))
        .filter(Boolean);
    });
  }, [appointmentQueries, conversationsQuery.data, currentUser, managedPropertyIds]);

  const summary = useMemo(
    () => ({
      total: events.length,
      pending: events.filter((event) => event.appointment.status === "pending").length,
      confirmed: events.filter((event) => event.appointment.status === "confirmed").length,
      today: events.filter((event) => format(event.start, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length
    }),
    [events]
  );

  const upcomingEvents = useMemo(
    () => [...events]
      .filter((event) => event.end >= new Date())
      .sort((left, right) => left.start - right.start)
      .slice(0, 6),
    [events]
  );

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

  if (isLoadingAppointments) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Calendrier" title="Rendez-vous de mes biens" description="Chargement du calendrier proprietaire." />
        <Card className="border-white/10 bg-white/5">
          <p className="text-sm text-stone-300">Chargement des rendez-vous...</p>
        </Card>
      </section>
    );
  }

  if (hasAppointmentError) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Calendrier" title="Rendez-vous de mes biens" description="Le calendrier proprietaire n'a pas pu etre charge." />
        <Card className="border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-200">Impossible de charger les rendez-vous de vos biens.</p>
        </Card>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-8">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-0">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <SectionTitle
                eyebrow="Calendrier"
                title="Rendez-vous de mes biens"
                description="Suivez uniquement les rendez-vous issus des conversations qui concernent vos biens geres."
              />
              <div className="flex flex-wrap gap-3">
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.24em] text-stone-300 backdrop-blur">
                  {events.length} rendez-vous synchronises
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Total", value: summary.total },
                { label: "Aujourd'hui", value: summary.today },
                { label: "En attente", value: summary.pending },
                { label: "Confirmes", value: summary.confirmed }
              ].map((item) => (
                <Card key={item.label} className="border-white/10 bg-black/20">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </Card>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden border-white/10 bg-white/[0.04] p-0">
            <div className="border-b border-white/10 px-5 py-5 lg:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Vue planning</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Calendrier proprietaire</h3>
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
              />
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Prochains rendez-vous</p>
              <div className="mt-5 space-y-3">
                {upcomingEvents.length ? upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className="w-full rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{event.title}</p>
                        <p className="mt-1 text-sm text-stone-400">{format(event.start, "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                      </div>
                      <Badge className={getStatusTone(event.appointment.status)}>
                        {APPOINTMENT_STATUS[event.appointment.status] || event.appointment.status}
                      </Badge>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-black/10 px-4 py-5 text-sm leading-6 text-stone-400">
                    Aucun rendez-vous a venir pour vos biens.
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-white/10 bg-white/[0.04]">
              {selectedEvent?.appointment ? (
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Detail du rendez-vous</p>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Bien</p>
                    <p className="mt-2 text-sm font-medium text-white">{selectedEvent.appointment.propertyTitle || "-"}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Client</p>
                    <p className="mt-2 text-sm font-medium text-white">{formatParticipantName(selectedEvent.client)}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agent</p>
                    <p className="mt-2 text-sm font-medium text-white">{formatParticipantName(selectedEvent.agent)}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Date</p>
                    <p className="mt-2 text-sm font-medium text-white">{format(selectedEvent.start, "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                    <p className="mt-1 text-sm text-stone-400">{selectedEvent.appointment.startTime} - {selectedEvent.appointment.endTime}</p>
                  </div>
                  {selectedEvent.appointment.description ? (
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Description</p>
                      <p className="mt-2 text-sm text-stone-300">{selectedEvent.appointment.description}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-stone-400">Selectionnez un rendez-vous pour afficher son detail.</div>
              )}
            </Card>
          </div>
        </div>
      </section>

      <ModalManageAppointment
        open={Boolean(selectedEvent)}
        mode="edit"
        readOnly
        appointment={selectedEvent?.appointment || null}
        propertyOptions={propertyOptions}
        currentUser={currentUser}
        agent={selectedEvent?.agent || null}
        client={selectedEvent?.client || null}
        isAgent={false}
        onClose={() => setSelectedEvent(null)}
        onSubmit={() => {}}
      />
    </>
  );
};

export default OwnerCalendarPage;
