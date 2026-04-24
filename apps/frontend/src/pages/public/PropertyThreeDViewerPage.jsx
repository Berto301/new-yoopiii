import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { ThreeDPropertyViewer } from "../../features/properties/components/ThreeDPropertyViewer.jsx";
import { getPropertyThreeDStatusMeta } from "../../features/properties/property-3d.js";
import { getPropertyThreeDDetail } from "../../features/properties/services/property.service.js";

const PropertyThreeDViewerSkeleton = () => (
  <section className="mx-auto max-w-7xl space-y-8 px-6 py-16">
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-52 rounded-full bg-white/10" />
      <div className="h-12 w-1/2 rounded-[1rem] bg-white/10" />
      <div className="h-[540px] rounded-[2rem] border border-white/10 bg-white/5" />
    </div>
  </section>
);

export const PropertyThreeDViewerPage = () => {
  const { id } = useParams();
  const detailQuery = useQuery({
    queryKey: ["property-three-d-detail", id],
    queryFn: () => getPropertyThreeDDetail(id),
    enabled: Boolean(id)
  });

  if (detailQuery.isLoading) {
    return <PropertyThreeDViewerSkeleton />;
  }

  const property = detailQuery.data || null;

  if (detailQuery.isError || !property) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#c9a66b]">Visite 3D</p>
          <h1 className="mt-4 font-serif text-4xl text-white">Visite indisponible</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
            Le bien demande n&apos;est pas disponible ou la visite 3D n&apos;a pas pu etre chargee.
          </p>
          <div className="mt-6">
            <Button as={Link} to="/properties" variant="secondary">
              Retour aux biens
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  const threeDStatus = getPropertyThreeDStatusMeta({
    is3DEnabled: property.is3DEnabled ?? property.has3DView,
    status: property.threeDStatus
  });

  if (!(property.is3DEnabled ?? property.has3DView) || !property.threeDUrl) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={threeDStatus.className}>{threeDStatus.label}</Badge>
            <Badge className="border-white/10 bg-white/5 text-stone-200">{property.title}</Badge>
          </div>
          <h1 className="mt-4 font-serif text-4xl text-white">Visite 3D non generee</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
            La visite 3D n&apos;est pas encore disponible pour ce bien. Revenez plus tard ou consultez la fiche detail.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button as={Link} to={`/properties/${property.slug || property.id}`} variant="secondary">
              Voir le bien
            </Button>
            <Button as={Link} to="/properties">
              Retour aux biens
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-6 py-16">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={threeDStatus.className}>{threeDStatus.label}</Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-200">
            {property.threeDSourceMedia?.length || 0} medias relies
          </Badge>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a66b]">Visite 3D</p>
            <h1 className="font-serif text-4xl leading-tight text-white md:text-6xl">{property.title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-stone-300">{property.address}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button as={Link} to={`/properties/${property.slug || property.id}`} variant="secondary">
              Retour a l'annonce
            </Button>
          </div>
        </div>
      </div>

      <ThreeDPropertyViewer property={property} />

      <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
        <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Mode d'exploration</p>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-stone-300">
          Cette visite 3D est construite automatiquement a partir des medias du bien, avec priorite aux fichiers televerses, puis aux images disponibles et enfin a la couverture en secours.
        </p>
      </Card>
    </section>
  );
};

export default PropertyThreeDViewerPage;
