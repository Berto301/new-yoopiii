import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { formatMoney } from "../../../app/preferences/user-preferences.utils.js";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Input } from "../../../components/ui/Input.jsx";

export const SearchFilters = () => {
  const { preferences } = useUserPreferences();

  return (
    <Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input label="Localisation" placeholder="Cocody, Abidjan" />
        <Input label="Type de bien" placeholder="Maison, terrain, appartement" />
        <Input label="Budget max" placeholder={formatMoney(150000000, undefined, preferences)} />
        <Input label="Rayon" placeholder="5 km, 10 km, 20 km" />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button>Rechercher</Button>
        <Button variant="secondary">Biens proches de moi</Button>
      </div>
    </Card>
  );
};
