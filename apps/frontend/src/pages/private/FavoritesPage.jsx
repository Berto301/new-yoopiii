import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { usePropertyWorkspace } from "../../features/properties/hooks/usePropertyWorkspace.js";

const formatPrice = (value, currency = "XOF") =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);

export const FavoritesPage = () => {
  const { favoritePropertiesQuery, favoriteMutation } = usePropertyWorkspace();
  const items = favoritePropertiesQuery.data?.items || [];

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow="Favoris"
        title="Vos biens suivis"
        description="Retrouvez rapidement les annonces que vous souhaitez comparer, revisiter ou reserver."
      />
      <div className="space-y-4">
        {items.map((property) => (
          <Card key={property.id} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">{property.title}</p>
              <p className="mt-1 text-sm text-stone-400">{property.address}</p>
              <p className="mt-2 text-sm text-brand-100">{formatPrice(property.price, property.currency)}</p>
            </div>
            <Button
              variant="secondary"
              className="px-4 py-2"
              disabled={favoriteMutation.isPending}
              onClick={() => favoriteMutation.mutate({ propertyId: property.id, isFavorite: true })}
            >
              Retirer des favoris
            </Button>
          </Card>
        ))}
        {!items.length ? (
          <Card>
            <p className="text-sm text-stone-300">Aucun bien en favori pour le moment.</p>
          </Card>
        ) : null}
      </div>
    </section>
  );
};
