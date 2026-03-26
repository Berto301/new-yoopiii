import { Card } from "../../../components/ui/Card.jsx";

const items = [
  { label: "Favoris", value: "12" },
  { label: "Reservations", value: "4" },
  { label: "Messages non lus", value: "7" }
];

export const UserDashboardOverview = () => (
  <div className="grid gap-4 md:grid-cols-3">
    {items.map((item) => (
      <Card key={item.label}>
        <p className="text-sm text-stone-400">{item.label}</p>
        <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
      </Card>
    ))}
  </div>
);
