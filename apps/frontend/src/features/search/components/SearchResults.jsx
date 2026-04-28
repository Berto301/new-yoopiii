import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { formatMoney } from "../../../app/preferences/user-preferences.utils.js";
import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";

const propertyRows = [
  {
    id: "p1",
    title: "Villa 5 pieces avec piscine",
    place: "Cocody Riviera",
    price: 145000000,
    distance: "3.2 km"
  },
  {
    id: "p2",
    title: "Appartement premium proche centre",
    place: "Plateau",
    price: 920000,
    period: " / mois",
    distance: "5.4 km"
  },
  {
    id: "p3",
    title: "Terrain titre foncier disponible",
    place: "Bingerville",
    price: 28500000,
    distance: "8.1 km"
  }
];

export const SearchResults = () => {
  const { preferences } = useUserPreferences();

  return (
    <div className="space-y-4">
      {propertyRows.map((property) => (
        <Card key={property.id} className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge>{property.distance}</Badge>
            <h3 className="text-xl font-semibold text-white">{property.title}</h3>
            <p className="text-sm text-stone-400">{property.place}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-lg font-semibold text-brand-100">{formatMoney(property.price, undefined, preferences)}{property.period || ""}</p>
            <p className="mt-1 text-sm text-stone-400">Disponible pour visite</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
