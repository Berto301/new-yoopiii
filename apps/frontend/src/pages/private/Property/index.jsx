import { useState } from "react";
import { Navigate } from "react-router-dom";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { notifyApiErrors } from "../../../lib/errors/api-error.js";
import { resolveAssetUrl } from "../../../lib/utils/asset-url.js";
import { getPropertyThreeDStatusMeta } from "../../../features/properties/property-3d.js";
import { usePropertyWorkspace } from "../../../features/properties/hooks/usePropertyWorkspace.js";
import { ModalManageProperty } from "./ModalManageProperty.jsx";
import { ModalManageContract } from "../contracts/ModalManageContract.jsx";

const formatPrice = (value, currency = "AR") =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value || 0)} ${currency || "AR"}`.trim();

const formatOwnerType = (ownerType) => {
  if (ownerType === "agency") return "Agence";
  if (ownerType === "proprietaire") return "Proprietaire";
  return "Agent independant";
};

const summaryCards = [
  {
    key: "total",
    label: "Biens total",
    description: "Portefeuille global sous supervision",
    accent: "from-amber-400/30 via-orange-400/15 to-transparent"
  },
  {
    key: "published",
    label: "Publies",
    description: "Biens visibles et actifs",
    accent: "from-emerald-400/30 via-emerald-300/10 to-transparent"
  },
  {
    key: "pendingApproval",
    label: "En attente",
    description: "Elements a valider ou publier",
    accent: "from-sky-400/30 via-cyan-300/10 to-transparent"
  },
  {
    key: "totalFavorites",
    label: "Favoris cumules",
    description: "Interet total capte sur la vitrine",
    accent: "from-fuchsia-400/25 via-rose-300/10 to-transparent"
  }
];

const getPublicationBadgeClassName = (publicationStatus) => {
  if (publicationStatus === "approved") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (publicationStatus === "rejected") {
    return "border-red-400/30 bg-red-400/10 text-red-100";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
};

const getStatusBadgeClassName = (status) => {
  if (status === "published") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "reserved") {
    return "border-sky-400/25 bg-sky-400/10 text-sky-100";
  }

  if (status === "archived") {
    return "border-white/10 bg-white/5 text-stone-200";
  }

  return "border-white/10 bg-white/5 text-stone-200";
};

const StatCard = ({ label, value, description, accent }) => (
  <Card className="relative overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
    <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
    <div className="relative space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{label}</p>
      <p className="text-3xl font-semibold text-white md:text-4xl">{value}</p>
      <p className="max-w-[22rem] text-sm leading-6 text-stone-300">{description}</p>
    </div>
  </Card>
);

const PropertyCard = ({
  property,
  user,
  linkedContract,
  workflowMutation,
  duplicateManagedPropertyMutation,
  deleteManagedPropertyMutation,
  onEdit,
  onDuplicate,
  onDelete,
  onAssociateContract
}) => {
  const coverImage = resolveAssetUrl(property.coverImage || property.media?.find((item) => item.type === "image")?.url || "");
  const mediaCount = property.media?.length || 0;
  const isOwnerRole = user?.role === "proprietaire";
  const canPublish = !isOwnerRole && Boolean(linkedContract?.actions?.canPublishProperty);
  const canReserve = !isOwnerRole && Boolean(linkedContract?.actions?.canReserveProperty);
  const canEdit = isOwnerRole || Boolean(linkedContract?.actions?.canEditProperty);
  const canDelete = isOwnerRole || Boolean(linkedContract?.actions?.canDeleteProperty);
  const threeDStatus = getPropertyThreeDStatusMeta({
    is3DEnabled: property.is3DEnabled ?? property.has3DView,
    status: property.threeDStatus
  });
  const detailItems = [
    { label: "Type", value: property.type || "--" },
    { label: "Usage", value: property.purpose || "--" },
    { label: "Fichiers", value: mediaCount },
    { label: "Gestion", value: formatOwnerType(property.ownerType) }
  ];

  return (
    <Card className="overflow-hidden border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-0">
      <div className="grid gap-0 xl:grid-cols-[340px_1fr]">
        <div className="relative min-h-[260px] overflow-hidden border-b border-white/10 xl:border-b-0 xl:border-r">
          {coverImage ? (
            <img src={coverImage} alt={property.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.35),transparent_30%),linear-gradient(135deg,rgba(41,37,36,1),rgba(28,25,23,0.92),rgba(12,10,9,1))]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,9,0.12),rgba(12,10,9,0.82))]" />

          <div className="relative flex h-full min-h-[260px] flex-col justify-between p-5 lg:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge className={getPublicationBadgeClassName(property.publicationStatus)}>{property.publicationStatus}</Badge>
              <Badge className={getStatusBadgeClassName(property.status)}>{property.status}</Badge>
              {(property.is3DEnabled ?? property.has3DView) ? <Badge className={threeDStatus.className}>3D {threeDStatus.label}</Badge> : null}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-200/80">{property.slug || "propriete"}</p>
              <div>
                <h3 className="text-2xl font-semibold text-white">{property.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-stone-200/85">{property.address}</p>
              </div>
              <p className="text-xl font-semibold text-amber-100">{formatPrice(property.price, property.currency)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-5 lg:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Resume du bien</p>
              <p className="max-w-3xl text-sm leading-7 text-stone-300">{property.description || "Aucune description disponible pour le moment."}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 text-right backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Favoris</p>
              <p className="mt-2 text-2xl font-semibold text-white">{property.favoriteCount || 0}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {detailItems.map((item) => (
              <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-stone-950/60 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{item.label}</p>
                <p className="mt-2 text-sm font-medium capitalize text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 pt-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
              {property.favoriteCount || 0} favoris • {mediaCount} fichiers • {(property.is3DEnabled ?? property.has3DView) ? `Visite 3D ${threeDStatus.label.toLowerCase()}` : "Sans visite 3D"}
            </p>
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <Button type="button" variant="secondary" className="px-4 py-2" onClick={() => onEdit(property)}>
                  Modifier
                </Button>
              ) : null}
              {isOwnerRole ? (
                <Button type="button" variant="secondary" className="px-4 py-2" onClick={() => onAssociateContract(property)}>
                  Associer a un contrat
                </Button>
              ) : canPublish ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4 py-2"
                  disabled={workflowMutation.isPending || property.publicationStatus === "approved"}
                  onClick={() => workflowMutation.mutate({ propertyId: property.id, payload: { publicationStatus: "approved", status: "published" } })}
                >
                  Publier
                </Button>
              ) : null}
              <Button type="button" variant="ghost" className="px-4 py-2" disabled={duplicateManagedPropertyMutation.isPending} onClick={() => onDuplicate(property)}>
                Dupliquer
              </Button>
              {canReserve ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-4 py-2"
                  disabled={workflowMutation.isPending || property.status === "reserved"}
                  onClick={() => workflowMutation.mutate({ propertyId: property.id, payload: { status: "reserved" } })}
                >
                  Reserver
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                className="px-4 py-2"
                disabled={workflowMutation.isPending || property.status === "archived"}
                onClick={() => workflowMutation.mutate({ propertyId: property.id, payload: { status: "archived" } })}
              >
                Archiver
              </Button>
              {canDelete ? (
                <Button type="button" variant="ghost" className="px-4 py-2 text-red-200" disabled={deleteManagedPropertyMutation.isPending} onClick={() => onDelete(property)}>
                  Supprimer
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const PropertyManagementPage = () => {
  const {
    user,
    managedPropertiesQuery,
    activeContractsQuery,
    contractsQuery,
    tenantSuggestionsQuery,
    workflowMutation,
    createManagedPropertyMutation,
    createContractMutation,
    uploadContractDocumentMutation,
    uploadPropertyAssetMutation,
    updateContractMutation,
    updateManagedPropertyMutation,
    generateManagedPropertyThreeDMutation,
    duplicateManagedPropertyMutation,
    deleteManagedPropertyMutation
  } = usePropertyWorkspace();
  const { showSuccess, showError } = useNotification();
  const [modalMode, setModalMode] = useState("create");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [contractModalState, setContractModalState] = useState({ open: false, mode: "create", contract: null });

  const isOwnerRole = user?.role === "proprietaire";

  if (!user || !["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role)) {
    return <Navigate to="/dashboard/user" replace />;
  }

  const openCreateModal = () => {
    if (!isOwnerRole && !(activeContractsQuery.data || []).length) {
      showError("Aucun contrat valide ne permet actuellement de gerer ou creer un bien.");
      return;
    }

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

  const openCreateContractModal = () => {
    if (!selectedProperty?.id) {
      showError("Enregistrez d'abord le bien avant d'ajouter un contrat.");
      return;
    }

    setContractModalState({ open: true, mode: "create", contract: null });
  };

  const openEditContractModal = (contract) => {
    setContractModalState({ open: true, mode: "edit", contract });
  };

  const handleAssociateContract = (property) => {
    setSelectedProperty(property);
    setContractModalState({ open: true, mode: "create", contract: null });
  };

  const closeContractModal = () => {
    setContractModalState({ open: false, mode: "create", contract: null });
  };

  const handleSaveProperty = async (payload) => {
    try {
      let savedProperty;

      if (modalMode === "edit" && selectedProperty) {
        savedProperty = await updateManagedPropertyMutation.mutateAsync({
          propertyId: selectedProperty.id,
          payload
        });
      } else {
        savedProperty = await createManagedPropertyMutation.mutateAsync(payload);
      }

      if (payload.is3DEnabled ?? payload.has3DView) {
        try {
          savedProperty = await generateManagedPropertyThreeDMutation.mutateAsync({
            propertyId: savedProperty.id,
            force: Boolean(savedProperty.threeDUrl)
          });
          showSuccess("Visite 3D generee automatiquement.");
        } catch (generationError) {
          notifyApiErrors({
            error: generationError,
            showError,
            fallbackMessage: "Le bien a ete enregistre, mais la generation 3D a echoue."
          });
        }
      }

      closeManageModal();
      showSuccess(modalMode === "edit" ? "Bien mis a jour." : "Bien cree avec succes.");
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La gestion du bien a echoue." });
      throw error;
    }
  };

  const handleGenerateThreeD = async ({ propertyId, force = true }) => {
    try {
      const updatedProperty = await generateManagedPropertyThreeDMutation.mutateAsync({ propertyId, force });
      setSelectedProperty((current) => (current?.id === updatedProperty.id ? updatedProperty : current));
      showSuccess(force ? "Visite 3D regeneree avec succes." : "Visite 3D generee avec succes.");
      return updatedProperty;
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La generation de la visite 3D a echoue." });
      throw error;
    }
  };

  const handleSaveContract = async (payload) => {
    try {
      if (contractModalState.mode === "edit" && contractModalState.contract) {
        await updateContractMutation.mutateAsync({ contractId: contractModalState.contract.id, payload });
      } else {
        await createContractMutation.mutateAsync(payload);
      }

      showSuccess(contractModalState.mode === "edit" ? "Contrat mis a jour." : "Contrat cree avec succes.");
      closeContractModal();
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La gestion du contrat a echoue." });
      throw error;
    }
  };

  const handlePropertyAssetUpload = async ({ assetKind, mediaType, file }) => {
    const uploadedAsset = await uploadPropertyAssetMutation.mutateAsync({ assetKind, mediaType, file });

    if (assetKind === "cover") {
      showSuccess("Image de couverture televersee avec succes.");
    } else {
      showSuccess(mediaType === "video" ? "Video televersee avec succes." : "Image televersee avec succes.");
    }

    return uploadedAsset;
  };

  const handleContractDocumentUpload = async ({ kind, contractId, file }) => {
    const uploadedDocument = await uploadContractDocumentMutation.mutateAsync({ kind, contractId, file });
    showSuccess(
      file?.name
        ? `${file.name} televerse dans les documents du contrat.`
        : "Document televerse avec succes."
    );
    return uploadedDocument;
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
        <Card className="border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <p className="text-sm text-stone-300">Chargement des proprietes...</p>
        </Card>
      </section>
    );
  }

  if (managedPropertiesQuery.isError) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Gestion biens" title="Pilotage des proprietes" description="L'espace de gestion n'a pas pu etre charge." />
        <Card className="border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-200">Une erreur est survenue lors du chargement des proprietes.</p>
        </Card>
      </section>
    );
  }

  const managed = managedPropertiesQuery.data;
  const items = managed?.items || [];
  const summary = managed?.summary || {};
  const contractOptions = (activeContractsQuery.data || []).map((contract) => ({
    label: `${contract.reference} • ${contract.owner?.fullName || "Proprietaire"} • ${contract.endDateLabel}`,
    value: contract.id
  }));
  const allContracts = contractsQuery.data || activeContractsQuery.data || [];
  const associatedContracts = (() => {
    if (!selectedProperty?.id) {
      return [];
    }

    const selectedPropertyId = String(selectedProperty.id);
    const selectedContractId = selectedProperty.managementContractId ? String(selectedProperty.managementContractId) : null;

    return (allContracts || []).filter((contract) => {
      const contractId = String(contract.id || "");
      const linkedPropertyIds = [
        contract.propertyId,
        ...(contract.coveredProperties || []).map((property) => property.id)
      ]
        .filter(Boolean)
        .map(String);

      return linkedPropertyIds.includes(selectedPropertyId) || (selectedContractId && contractId === selectedContractId);
    });
  })();
  const agencyOptions = selectedProperty?.agencyId || user?.agencyId
    ? [{ label: selectedProperty?.agencyName || "Agence courante", value: selectedProperty?.agencyId || user?.agencyId }]
    : [];
  const agentOptions = selectedProperty?.agentId || user?.id
    ? [{
        label: selectedProperty?.agentName || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Agent",
        value: selectedProperty?.agentId || user?.id
      }]
    : [];
  const tenantSuggestions = (tenantSuggestionsQuery.data || []).map((tenant) => ({
    id: tenant.id,
    fullName: tenant.fullName,
    phone: tenant.phone || tenant.contact || "",
    email: tenant.email || ""
  }));

  return (
    <>
      <section className="space-y-8">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-0">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <SectionTitle
                eyebrow={isOwnerRole ? "Mes biens" : "Gestion biens"}
                title={isOwnerRole ? "Pilotage proprietaire des biens" : "Pilotage des proprietes"}
                description={
                  isOwnerRole
                    ? "Retrouvez tous vos biens, rattachez-les a un contrat quand c'est utile et gardez une vue claire sur votre portefeuille."
                    : "Suivez les performances, soignez la presentation et pilotez chaque bien depuis un espace plus clair, plus rapide et plus professionnel."
                }
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" className="px-5 py-3" onClick={openCreateModal}>
                  Ajout de Bien
                </Button>
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.24em] text-stone-300 backdrop-blur">
                  {items.length} biens charges dans l'espace de gestion
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.24em] text-stone-300 backdrop-blur">
                  {contractOptions.length} contrats valides
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {summaryCards.map((card) => (
                <StatCard
                  key={card.key}
                  label={card.label}
                  value={summary[card.key] ?? 0}
                  description={card.description}
                  accent={card.accent}
                />
              ))}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Portefeuille actif</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Biens recents et operations rapides</h3>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-stone-400">
            Les cartes ci-dessous regroupent les infos essentielles, le visuel principal et les actions de publication pour gagner du temps sans perdre en lisibilite.
          </p>
        </div>

        {!isOwnerRole && !contractOptions.length ? (
          <Card className="border-amber-400/20 bg-amber-400/5">
            <p className="text-sm text-amber-100">
              Aucun contrat accepte ou actif n'est rattache a votre compte. La creation, la modification et la gestion des biens sont bloquees tant qu'un contrat valide avec un proprietaire n'est pas en place.
            </p>
          </Card>
        ) : null}

        <div className="space-y-5">
          {items.map((property) => (
            (() => {
              const linkedContract = (allContracts || []).find((contract) =>
                [contract.propertyId, ...(contract.coveredProperties || []).map((linkedProperty) => linkedProperty.id)].includes(property.id)
              ) || null;

              return (
              <PropertyCard
                key={property.id}
                property={property}
                user={user}
                linkedContract={linkedContract}
                workflowMutation={workflowMutation}
                duplicateManagedPropertyMutation={duplicateManagedPropertyMutation}
                deleteManagedPropertyMutation={deleteManagedPropertyMutation}
                onEdit={openEditModal}
                onDuplicate={handleDuplicateProperty}
                onDelete={handleDeleteProperty}
                onAssociateContract={handleAssociateContract}
              />
              );
            })()
          ))}

          {!items.length ? (
            <Card className="border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-center">
              <p className="text-sm font-medium text-white">Aucune propriete a gerer pour le moment.</p>
              <p className="mt-2 text-sm leading-6 text-stone-400">Commencez par ajouter un bien pour structurer votre portefeuille et centraliser sa publication.</p>
              <div className="mt-5">
                <Button type="button" className="px-5 py-3" onClick={openCreateModal}>
                  Creer le premier bien
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </section>

      <ModalManageProperty
        open={isManageModalOpen}
        mode={modalMode}
        property={selectedProperty}
        associatedContracts={associatedContracts}
        onEditContract={openEditContractModal}
        onClose={closeManageModal}
        onSubmit={handleSaveProperty}
        onGenerateThreeD={handleGenerateThreeD}
        onUploadAsset={handlePropertyAssetUpload}
        onUploadError={(error) => notifyApiErrors({ error, showError, fallbackMessage: "Le televersement du fichier a echoue." })}
        isUploadingAsset={uploadPropertyAssetMutation.isPending}
        isGeneratingThreeD={generateManagedPropertyThreeDMutation.isPending}
        isSaving={createManagedPropertyMutation.isPending || updateManagedPropertyMutation.isPending}
      />

      <ModalManageContract
        open={contractModalState.open}
        mode={contractModalState.mode}
        contract={contractModalState.contract}
        propertyId={selectedProperty?.id || ""}
        propertyContext={selectedProperty ? {
          id: selectedProperty.id,
          label: selectedProperty.title,
          purpose: selectedProperty.purpose,
          price: selectedProperty.price,
          currency: selectedProperty.currency
        } : null}
        ownerUserId={selectedProperty?.ownerUserId || ""}
        agencyOptions={agencyOptions}
        agentOptions={agentOptions}
        tenantSuggestions={tenantSuggestions}
        onUploadDocument={handleContractDocumentUpload}
        onUploadError={(error) => notifyApiErrors({ error, showError, fallbackMessage: "Le televersement du document a echoue." })}
        onClose={closeContractModal}
        onSubmit={handleSaveContract}
        isSaving={createContractMutation.isPending || updateContractMutation.isPending}
        isUploadingDocument={uploadContractDocumentMutation.isPending}
      />
    </>
  );
};
