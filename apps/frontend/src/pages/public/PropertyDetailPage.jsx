import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { getPublicPropertyDetail } from "../../features/properties/services/property.service.js";
import { PropertyDetailContent, buildPropertyDetailMediaItems } from "../../features/properties/components/PropertyDetailContent.jsx";

const PropertyDetailSkeleton = () => (
  <section className="mx-auto max-w-7xl space-y-8 px-6 py-16">
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-40 rounded-full bg-white/10" />
      <div className="h-12 w-2/3 rounded-[1rem] bg-white/10" />
      <div className="h-5 w-full rounded-full bg-white/10" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="h-[520px] rounded-[2rem] border border-white/10 bg-white/5" />
      <div className="space-y-6">
        <div className="h-64 rounded-[2rem] border border-white/10 bg-white/5" />
        <div className="h-48 rounded-[2rem] border border-white/10 bg-white/5" />
      </div>
    </div>
  </section>
);

export const PropertyDetailPage = () => {
  const { id } = useParams();
  const detailQuery = useQuery({
    queryKey: ["public-property-detail", id],
    queryFn: () => getPublicPropertyDetail(id),
    enabled: Boolean(id)
  });
  const property = detailQuery.data || null;
  const [selectedImageUrl, setSelectedImageUrl] = useState("");

  useEffect(() => {
    const mediaItems = buildPropertyDetailMediaItems(property);
    setSelectedImageUrl(mediaItems[0]?.url || "");
  }, [property]);

  if (detailQuery.isLoading) {
    return <PropertyDetailSkeleton />;
  }

  if (detailQuery.isError || !property) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <Card className="rounded-[2rem] border-white/10 bg-white/[0.04]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#c9a66b]">Annonce detail</p>
          <h1 className="mt-4 font-serif text-4xl text-white">Bien introuvable</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
            Le bien demande n&apos;est pas disponible ou n&apos;est plus publie pour le moment.
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

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <PropertyDetailContent
        property={property}
        selectedImageUrl={selectedImageUrl}
        onSelectImage={setSelectedImageUrl}
        showBrowseButton
        browseHref="/login"
      />
    </section>
  );
};

export default PropertyDetailPage;
