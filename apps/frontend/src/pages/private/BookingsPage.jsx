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

export const BookingsPage = () => {
  const { user, bookingsQuery } = useBookingsWorkspace();
  const items = bookingsQuery.data || [];

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
      <SectionTitle
        eyebrow="Reservations"
        title="Vos visites et demandes en cours"
        description="Retrouvez ici les biens reserves, les clients concernes et le suivi du statut."
      />

      <div className="space-y-4">
        {items.map((booking) => (
          <Card key={booking._id} className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-white">{booking.property?.title || "Bien reserve"}</p>
                <Badge>{booking.status}</Badge>
              </div>
              <p className="text-sm text-stone-400">{booking.property?.address || "Adresse non disponible"}</p>
              {booking.property?.price ? <p className="text-sm text-brand-100">{formatPrice(booking.property.price, booking.property.currency)}</p> : null}
              <p className="text-sm text-stone-300">
                {user?.role === "user"
                  ? `Agent: ${[booking.agent?.firstName, booking.agent?.lastName].filter(Boolean).join(" ") || "Non renseigne"}`
                  : `Client: ${[booking.customer?.firstName, booking.customer?.lastName].filter(Boolean).join(" ") || booking.customer?.email || "Non renseigne"}`}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                {booking.timeSlot} • {new Date(booking.requestedDate).toLocaleString("fr-FR")}
              </p>
            </div>
          </Card>
        ))}

        {!items.length ? (
          <Card>
            <p className="text-sm text-stone-300">Aucune reservation pour le moment.</p>
          </Card>
        ) : null}
      </div>
    </section>
  );
};
