import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { formatBookingDateTime, parseBookingDateTime } from "../../../features/bookings/booking.utils.js";
import { useBookingsWorkspace } from "../../../features/bookings/hooks/useBookingsWorkspace.js";

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

const bookingStatusTone = {
  confirmed: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  cancelled: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  completed: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  rejected: "border-red-400/30 bg-red-500/10 text-red-100"
};

const buildBookingEvent = (booking) => {
  if (!booking?.requestedDate) {
    return null;
  }

  const start = parseBookingDateTime(booking.requestedDate, booking.timeSlot);

  if (!start || Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    id: booking._id,
    title: booking.property?.title || "Rendez-vous",
    start,
    end,
    allDay: false,
    booking
  };
};

const formatBookingDate = (value) =>
  formatBookingDateTime(value);

export const OwnerCalendarPage = () => {
  const { bookingsQuery } = useBookingsWorkspace();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const bookings = bookingsQuery.data || [];

  const events = useMemo(
    () => bookings.map(buildBookingEvent).filter(Boolean),
    [bookings]
  );

  const summary = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((item) => item.status === "pending").length,
      confirmed: bookings.filter((item) => item.status === "confirmed").length,
      today: bookings.filter((item) => {
        const parsedDate = parseBookingDateTime(item.requestedDate, item.timeSlot);
        if (!parsedDate) return false;
        return format(parsedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
      }).length
    }),
    [bookings]
  );

  const upcomingBookings = useMemo(
    () => [...bookings]
      .filter((item) => {
        const parsedDate = parseBookingDateTime(item.requestedDate, item.timeSlot);
        return parsedDate && parsedDate >= new Date();
      })
      .sort((left, right) => parseBookingDateTime(left.requestedDate, left.timeSlot) - parseBookingDateTime(right.requestedDate, right.timeSlot))
      .slice(0, 6),
    [bookings]
  );

  if (bookingsQuery.isLoading) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Calendrier" title="Rendez-vous de mes biens" description="Chargement du calendrier proprietaire." />
        <Card className="border-white/10 bg-white/5">
          <p className="text-sm text-stone-300">Chargement des rendez-vous...</p>
        </Card>
      </section>
    );
  }

  if (bookingsQuery.isError) {
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
    <section className="space-y-8">
      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-0">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-5">
            <SectionTitle
              eyebrow="Calendrier"
              title="Rendez-vous de mes biens"
              description="Suivez uniquement les rendez-vous, visites et reservations lies a vos propres biens dans une vue calendrier dediee."
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
              {upcomingBookings.length ? upcomingBookings.map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  onClick={() => setSelectedEvent({ booking })}
                  className="w-full rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{booking.property?.title || "Bien"}</p>
                      <p className="mt-1 text-sm text-stone-400">{formatBookingDateTime(booking.requestedDate, booking.timeSlot)}</p>
                    </div>
                    <Badge className={bookingStatusTone[booking.status] || "border-white/10 bg-white/5 text-stone-200"}>
                      {booking.status}
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
            {selectedEvent?.booking ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Detail du rendez-vous</p>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Bien</p>
                  <p className="mt-2 text-sm font-medium text-white">{selectedEvent.booking.property?.title || "-"}</p>
                  <p className="mt-1 text-sm text-stone-400">{selectedEvent.booking.property?.address || ""}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Client</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {[selectedEvent.booking.customer?.firstName, selectedEvent.booking.customer?.lastName].filter(Boolean).join(" ") || selectedEvent.booking.customer?.email || "-"}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agent</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {[selectedEvent.booking.agent?.firstName, selectedEvent.booking.agent?.lastName].filter(Boolean).join(" ") || selectedEvent.booking.agent?.email || "-"}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Date</p>
                  <p className="mt-2 text-sm font-medium text-white">{formatBookingDateTime(selectedEvent.booking.requestedDate, selectedEvent.booking.timeSlot)}</p>
                  <p className="mt-1 text-sm text-stone-400">{selectedEvent.booking.timeSlot || "Horaire non renseigne"}</p>
                </div>
                {selectedEvent.booking.message ? (
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Message</p>
                    <p className="mt-2 text-sm text-stone-300">{selectedEvent.booking.message}</p>
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
  );
};

export default OwnerCalendarPage;
