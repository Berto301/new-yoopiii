import { Card } from "../../../components/ui/Card.jsx";

export const MapPanel = () => (
  <Card className="min-h-[520px] bg-[radial-gradient(circle_at_top,_rgba(47,133,90,0.22),transparent_35%),linear-gradient(180deg,rgba(17,24,39,0.8),rgba(12,15,13,0.95))]">
    <div className="flex h-full min-h-[460px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 text-center text-sm leading-7 text-stone-300">
      Zone Google Maps, geolocalisation utilisateur, marqueurs, clustering et vue 3D si disponible.
    </div>
  </Card>
);
