import { Card } from "../../../components/ui/Card.jsx";

const items = [
  { label: "Biens actifs", value: "18" },
  { label: "Visites planifiees", value: "9" },
  { label: "Score agent", value: "84/100" }
];

export const AgentDashboardOverview = () => (
  <div className="grid gap-4 md:grid-cols-3">
    {items.map((item) => (
      <Card key={item.label}>
        <p className="text-sm text-stone-400">{item.label}</p>
        <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
      </Card>
    ))}
  </div>
);
