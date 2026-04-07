import { useMemo } from "react";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useBookingsWorkspace } from "../../features/bookings/hooks/useBookingsWorkspace.js";

const formatPrice = (value, currency = "XOF") =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);

const formatSchedule = (booking) => {
  if (!booking.requestedDate) {
    return booking.timeSlot || "Planification en attente";
  }

  const formattedDate = new Date(booking.requestedDate).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return booking.timeSlot ? `${booking.timeSlot} - ${formattedDate}` : formattedDate;
};

const getPropertyCover = (property) => property?.coverImage || property?.media?.find((item) => item.type === "image")?.url || "";

const getPropertySpecs = (property) => [
  property?.type || null,
  property?.purpose || null,
  property?.area ? `${property.area} m2` : null,
  property?.rooms ? `${property.rooms} pieces` : null,
  property?.bedrooms ? `${property.bedrooms} chambres` : null,
  property?.bathrooms ? `${property.bathrooms} salles de bain` : null
].filter(Boolean);

const getStatusBadgeClassName = (status) => {
  switch (status) {
    case "confirmed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
    case "cancelled":
      return "border-rose-500/30 bg-rose-500/10 text-rose-100";
    case "completed":
      return "border-sky-500/30 bg-sky-500/10 text-sky-100";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }
};

const getParticipant = (booking, role) => (role === "user" ? booking.agent : booking.customer);

const getParticipantLabel = (role) => (role === "user" ? "Agent en charge" : "Client concerne");

const getParticipantType = (role) => (role === "user" ? "agent" : "user");

const getParticipantName = (participant) =>
  [participant?.firstName, participant?.lastName].filter(Boolean).join(" ") || participant?.email || "Non renseigne";

export const BookingsPage = () => {
  const { user, bookingsQuery } = useBookingsWorkspace();
  const items = bookingsQuery.data || [];

  const metrics = useMemo(() => {
    const confirmed = items.filter((booking) => booking.status === "confirmed").length;
    const pending = items.filter((booking) => booking.status === "pending").length;
    const completed = items.filter((booking) => booking.status === "completed").length;

    return [
      { label: "Reservations", value: items.length },
      { label: "Confirmees", value: confirmed },
      { label: "En attente", value: pending },
      { label: "Finalisees", value: completed }
    ];
  }, [items]);

  if (bookingsQuery.isLoading) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Reservations" title="Vos visites et demandes en cours" description="Chargement des reservations." />
        <Card><p className="text-sm text-stone-300">Chargement des reservations...</p></Card>
      </section>
    );
  }

  if (bookingsQuery.isError) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Reservations" title="Vos visites et demandes en cours" description="Les reservations n'ont pas pu etre chargees." />
        <Card><p className="text-sm text-red-300">Impossible de charger les reservations.</p></Card>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.95),rgba(12,10,9,0.98))] p-6 shadow-[0_32px_90px_rgba(15,23,42,0.32)] lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.9fr] xl:items-end">
          <SectionTitle
            eyebrow="Reservations"
            title="Vos visites et demandes dans une vue plus executive"
            description="Retrouvez chaque dossier avec le visuel du bien, ses caracteristiques principales, son statut et la personne liee au rendez-vous."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((booking) => {
          const property = booking.property || {};
          const coverImage = getPropertyCover(property);
          const specs = getPropertySpecs(property);
          const participant = getParticipant(booking, user?.role);
          const participantName = getParticipantName(participant);
          const participantLabel = getParticipantLabel(user?.role);

          return (
            <Card
              key={booking._id}
              className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-0 shadow-[0_24px_60px_rgba(15,23,42,0.24)]"
            >
              <div className="grid gap-0 xl:grid-cols-[1fr_1.3fr]">
                <div className="relative min-h-[280px] bg-stone-950">
                  {coverImage ? (
                    <img src={coverImage} alt={property.title || "Bien reserve"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[280px] items-center justify-center bg-[linear-gradient(135deg,rgba(14,165,233,0.22),rgba(28,25,23,0.98))] text-sm uppercase tracking-[0.22em] text-stone-100">
                      Reservation immobiliere
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <Badge className={getStatusBadgeClassName(booking.status)}>{booking.status}</Badge>
                    {property.status ? <Badge className="border-white/10 bg-black/30 text-white">{property.status}</Badge> : null}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-300">Adresse du bien</p>
                    <p className="mt-2 text-sm leading-6 text-white/90">{property.address || "Adresse non disponible"}</p>
                  </div>
                </div>

                <div className="space-y-6 p-6 lg:p-7">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold text-white">{property.title || "Bien reserve"}</h2>
                        {property.purpose ? <Badge className="border-white/10 bg-white/10 text-stone-100">{property.purpose}</Badge> : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-stone-300">
                        Suivi de reservation avec une vision directe sur le bien, le planning et le contact principal.
                      </p>
                    </div>

                    {property.price ? (
                      <div className="rounded-3xl border border-brand-500/20 bg-brand-500/10 px-5 py-4 text-right shadow-[0_18px_40px_rgba(249,115,22,0.14)]">
                        <p className="text-xs uppercase tracking-[0.2em] text-brand-100/80">Valeur du bien</p>
                        <p className="mt-2 text-2xl font-semibold text-brand-100">{formatPrice(property.price, property.currency)}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Caracteristiques du bien</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {specs.length ? specs.map((spec) => (
                          <Badge key={spec} className="border-white/10 bg-white/5 text-stone-200">{spec}</Badge>
                        )) : <span className="text-sm text-stone-400">Caracteristiques non disponibles.</span>}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {property.features?.length ? property.features.slice(0, 5).map((feature) => (
                          <span key={feature} className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-300">
                            {feature}
                          </span>
                        )) : <span className="text-sm text-stone-400">Aucune option detaillee pour cette reservation.</span>}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Planning</p>
                        <p className="mt-3 text-lg font-semibold text-white">{formatSchedule(booking)}</p>
                        <p className="mt-2 text-sm text-stone-300">Source: {booking.source || "reservation"}</p>
                        {booking.message ? <p className="mt-3 text-sm leading-6 text-stone-400">{booking.message}</p> : null}
                      </div>

                      <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{participantLabel}</p>
                        <div className="mt-4 flex items-center gap-4">
                          <Avatar
                            src={participant?.avatar}
                            alt={`Photo de ${participantName}`}
                            name={participantName}
                            size="lg"
                            variant="message"
                            type={getParticipantType(user?.role)}
                          />
                          <div>
                            <p className="text-lg font-semibold text-white">{participantName}</p>
                            <p className="mt-1 text-sm text-stone-400">{participant?.email || "Contact interne"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {!items.length ? (
          <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Reservations</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Aucune reservation pour le moment</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
              Des qu'une visite, une demande ou une reservation est creee, elle apparaitra ici avec le bien associe, ses details et la personne impliquee.
            </p>
          </Card>
        ) : null}
      </div>
    </section>
  );
};

export default BookingsPage;
