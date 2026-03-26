import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Input } from "../../../components/ui/Input.jsx";

export const SearchFilters = () => (
  <Card>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Input label="Localisation" placeholder="Cocody, Abidjan" />
      <Input label="Type de bien" placeholder="Maison, terrain, appartement" />
      <Input label="Budget max" placeholder="150 000 000 XOF" />
      <Input label="Rayon" placeholder="5 km, 10 km, 20 km" />
    </div>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button>Rechercher</Button>
      <Button variant="secondary">Biens proches de moi</Button>
    </div>
  </Card>
);
