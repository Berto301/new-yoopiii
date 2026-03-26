import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";

export const PropertyDetailPage = () => (
  <section className="mx-auto max-w-7xl px-6 py-16">
    <SectionTitle
      eyebrow="Annonce detail"
      title="Villa contemporaine avec vue degagee"
      description="Fiche detail enrichie avec galerie, geolocalisation, caracteristiques, reservation de visite, favoris et notation."
    />
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="min-h-[480px]" />
      <Card>
        <p className="text-3xl font-semibold text-brand-100">145 000 000 XOF</p>
        <p className="mt-3 text-sm leading-7 text-stone-300">
          5 chambres, 2 salons, piscine, parking et acces rapide aux commodites principales.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button>Reserver une visite</Button>
          <Button variant="secondary">Ajouter aux favoris</Button>
        </div>
      </Card>
    </div>
  </section>
);
