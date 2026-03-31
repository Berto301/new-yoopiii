import dayjs from "dayjs";
import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { usePropertyWorkspace } from "../../properties/hooks/usePropertyWorkspace.js";

const formatPrice = (value, currency = "XOF") =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);

export const UserDashboardOverview = () => {
  const { favoritePropertiesQuery, propertyHistoryQuery } = usePropertyWorkspace();
  const favorites = favoritePropertiesQuery.data?.items || [];
  const history = propertyHistoryQuery.data?.items || [];

  const items = [
    { label: "Favoris", value: favoritePropertiesQuery.data?.pagination?.total ?? 0 },
    { label: "Historiques", value: propertyHistoryQuery.data?.pagination?.total ?? 0 },
    { label: "Derniers biens vus", value: history.length }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-stone-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-400">Favoris actifs</p>
            <Badge>{favorites.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {favorites.slice(0, 4).map((property) => (
              <div key={property.id} className="rounded-2xl border border-white/10 p-4">
                <p className="font-semibold text-white">{property.title}</p>
                <p className="mt-1 text-sm text-stone-400">{property.address}</p>
                <p className="mt-2 text-sm text-brand-100">{formatPrice(property.price, property.currency)}</p>
              </div>
            ))}
            {!favorites.length ? <p className="text-sm text-stone-400">Aucun favori pour le moment.</p> : null}
          </div>
        </Card>

        <Card>
          <p className="text-sm text-stone-400">Historique recent</p>
          <div className="mt-4 space-y-3">
            {history.slice(0, 4).map((entry) => (
              <div key={`${entry.property.id}-${entry.viewedAt}`} className="rounded-2xl border border-white/10 p-4">
                <p className="font-semibold text-white">{entry.property.title}</p>
                <p className="mt-1 text-sm text-stone-400">Vu via {entry.source} le {dayjs(entry.viewedAt).format("DD/MM/YYYY HH:mm")}</p>
                <Button className="mt-3 px-4 py-2" variant="secondary" disabled>
                  {entry.property.isFavorite ? "Deja en favori" : "Disponible en favoris"}
                </Button>
              </div>
            ))}
            {!history.length ? <p className="text-sm text-stone-400">Aucun historique disponible.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
};
