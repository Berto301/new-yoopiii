import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { getPublicPropertyDetail } from "../services/property.service.js";
import { PropertyDetailContent, buildPropertyDetailMediaItems } from "./PropertyDetailContent.jsx";
import { selectCurrentUser } from "../../../app/store/session.store.js";
import { ModalShowBien } from "../../../pages/private/Property/ModalShowBien.jsx";

export const ModalViewDetail = ({
  open,
  propertyIdentifier,
  onClose
}) => {
  const detailQuery = useQuery({
    queryKey: ["modal-property-detail", propertyIdentifier],
    queryFn: () => getPublicPropertyDetail(propertyIdentifier),
    enabled: open && Boolean(propertyIdentifier)
  });
  const property = detailQuery.data || null;
  const currentUser = useSelector(selectCurrentUser);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [directionProperty, setDirectionProperty] = useState(null);

  useEffect(() => {
    if (!property) {
      setSelectedImageUrl("");
      return;
    }

    const mediaItems = buildPropertyDetailMediaItems(property);
    setSelectedImageUrl(mediaItems[0]?.url || "");
  }, [property]);

  return (
    <ModalLayout
      open={open}
      title={property?.title || "Detail du bien"}
      onClose={onClose}
      onSave={onClose}
      saveLabel="Fermer"
      cancelLabel="Fermer"
      panelClassName="max-w-6xl"
      footerContent={
        <div className="flex justify-end border-t border-white/10 pt-4">
          <Button type="button" variant="secondary" className="px-5 py-3" onClick={onClose}>
            Fermer
          </Button>
        </div>
      }
    >
      {detailQuery.isLoading ? (
        <div className="py-12 text-center text-sm text-stone-300">Chargement du detail du bien...</div>
      ) : detailQuery.isError || !property ? (
        <div className="py-12 text-center text-sm text-red-200">
          Impossible de charger le detail du bien pour le moment.
        </div>
      ) : (
        <PropertyDetailContent
          property={property}
          selectedImageUrl={selectedImageUrl}
          onSelectImage={setSelectedImageUrl}
          showBrowseButton={false}
          showDirectionButton={currentUser?.role === "user"}
          onOpenDirection={setDirectionProperty}
        />
      )}
      <ModalShowBien
        open={Boolean(directionProperty)}
        property={directionProperty}
        user={currentUser}
        onClose={() => setDirectionProperty(null)}
      />
    </ModalLayout>
  );
};

