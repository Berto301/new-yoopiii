import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useAgencyDashboard } from "../../features/agency/hooks/useAgencyDashboard.js";

export const AgencyCalendarPage = () => {
  const { eventsQuery } = useAgencyDashboard();

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow="Calendrier agence"
        title="Planning des visites et disponibilites"
        description="Vue connectee au backend calendrier pour centraliser visites, rendez-vous et suivi des disponibilites."
      />

      {eventsQuery.isLoading ? (
        <Card><p className="text-sm text-stone-300">Chargement du planning...</p></Card>
      ) : eventsQuery.isError ? (
        <Card><p className="text-sm text-red-300">Impossible de charger le planning agence.</p></Card>
      ) : (
        <div className="space-y-4">
          {eventsQuery.data?.items?.map((event) => (
            <Card key={event._id || event.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white">{event.title}</p>
                <p className="mt-1 text-sm capitalize text-stone-400">{event.type}</p>
              </div>
              <p className="text-sm text-stone-300">{new Date(event.startAt).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
