import { useState } from "react";
import { Navigate } from "react-router-dom";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { usePropertyWorkspace } from "../../../features/properties/hooks/usePropertyWorkspace.js";
import { ModalManageProperty } from "./ModalManageProperty.jsx";

const formatPrice = (value, currency = "XOF") =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);

export const PropertyManagementPage = () => {
  const {
    user,
    managedPropertiesQuery,
    workflowMutation,
    createManagedPropertyMutation,
    updateManagedPropertyMutation,
    duplicateManagedPropertyMutation,
    deleteManagedPropertyMutation
  } = usePropertyWorkspace();
  const [modalMode, setModalMode] = useState("create");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  if (!user || !["agency", "agency_agent", "independent_agent"].includes(user.role)) {
    return <Navigate to="/dashboard/user" replace />;
  }

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedProperty(null);
    setIsManageModalOpen(true);
  };

  const openEditModal = (property) => {
    setModalMode("edit");
    setSelectedProperty(property);
    setIsManageModalOpen(true);
  };

  const closeManageModal = () => {
    setSelectedProperty(null);
    setIsManageModalOpen(false);
  };

  const handleSaveProperty = async (payload) => {
    if (modalMode === "edit" && selectedProperty) {
      await updateManagedPropertyMutation.mutateAsync({
        propertyId: selectedProperty.id,
        payload
      });
    } else {
      await createManagedPropertyMutation.mutateAsync(payload);
    }

    closeManageModal();
  };

  const handleDuplicateProperty = async (property) => {
    await duplicateManagedPropertyMutation.mutateAsync({
      propertyId: property.id,
      payload: { title: `${property.title} copie` }
    });
  };

  const handleDeleteProperty = async (property) => {
    const confirmed = window.confirm(`Supprimer definitivement ${property.title} ?`);
    if (!confirmed) return;
    await deleteManagedPropertyMutation.mutateAsync(property.id);
  };

  if (managedPropertiesQuery.isLoading) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Gestion biens" title="Pilotage des proprietes" description="Chargement des proprietes sous votre responsabilite." />
        <Card><p className="text-sm text-stone-300">Chargement des proprietes...</p></Card>
      </section>
    );
  }

  if (managedPropertiesQuery.isError) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Gestion biens" title="Pilotage des proprietes" description="L'espace de gestion n'a pas pu etre charge." />
        <Card><p className="text-sm text-red-300">Une erreur est survenue lors du chargement des proprietes.</p></Card>
      </section>
    );
  }

  const managed = managedPropertiesQuery.data;
  const items = managed?.items || [];
  const summary = managed?.summary || {};

  return (
    <>
      <section className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow="Gestion biens"
            title="Pilotage des proprietes"
            description="Agence et agents peuvent suivre les publications, statuts et performances des biens depuis un espace dedie."
          />
          <Button type="button" className="px-5 py-3" onClick={openCreateModal}>
            Ajout de Bien
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><p className="text-sm text-stone-400">Biens total</p><p className="mt-3 text-3xl font-semibold text-white">{summary.total ?? 0}</p></Card>
          <Card><p className="text-sm text-stone-400">Publies</p><p className="mt-3 text-3xl font-semibold text-white">{summary.published ?? 0}</p></Card>
          <Card><p className="text-sm text-stone-400">En attente</p><p className="mt-3 text-3xl font-semibold text-white">{summary.pendingApproval ?? 0}</p></Card>
          <Card><p className="text-sm text-stone-400">Favoris cumules</p><p className="mt-3 text-3xl font-semibold text-white">{summary.totalFavorites ?? 0}</p></Card>
        </div>

        <div className="space-y-4">
          {items.map((property) => (
            <Card key={property.id} className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-white">{property.title}</h3>
                  <Badge>{property.publicationStatus}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-stone-200">{property.status}</Badge>
                  {property.has3DView ? <Badge className="border-brand-500/30 bg-brand-500/10 text-brand-100">3D</Badge> : null}
                </div>
                <p className="text-sm text-stone-400">{property.address}</p>
                <p className="text-sm text-brand-100">{formatPrice(property.price, property.currency)}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{property.favoriteCount} favoris • {property.ownerType} • {property.media?.length || 0} fichiers</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="px-4 py-2" onClick={() => openEditModal(property)}>
                  Modifier
                </Button>
                <Button type="button" variant="secondary" className="px-4 py-2" disabled={workflowMutation.isPending || property.publicationStatus === "approved"} onClick={() => workflowMutation.mutate({ propertyId: property.id, payload: { publicationStatus: "approved", status: "published" } })}>
                  Publier
                </Button>
                <Button type="button" variant="ghost" className="px-4 py-2" disabled={duplicateManagedPropertyMutation.isPending} onClick={() => handleDuplicateProperty(property)}>
                  Dupliquer
                </Button>
                <Button type="button" variant="ghost" className="px-4 py-2" disabled={workflowMutation.isPending || property.status === "reserved"} onClick={() => workflowMutation.mutate({ propertyId: property.id, payload: { status: "reserved" } })}>
                  Reserver
                </Button>
                <Button type="button" variant="ghost" className="px-4 py-2" disabled={workflowMutation.isPending || property.status === "archived"} onClick={() => workflowMutation.mutate({ propertyId: property.id, payload: { status: "archived" } })}>
                  Archiver
                </Button>
                <Button type="button" variant="ghost" className="px-4 py-2 text-red-200" disabled={deleteManagedPropertyMutation.isPending} onClick={() => handleDeleteProperty(property)}>
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}

          {!items.length ? <Card><p className="text-sm text-stone-300">Aucune propriete a gerer pour le moment.</p></Card> : null}
        </div>
      </section>

      <ModalManageProperty
        open={isManageModalOpen}
        mode={modalMode}
        property={selectedProperty}
        onClose={closeManageModal}
        onSubmit={handleSaveProperty}
        isSaving={createManagedPropertyMutation.isPending || updateManagedPropertyMutation.isPending}
      />
    </>
  );
};
