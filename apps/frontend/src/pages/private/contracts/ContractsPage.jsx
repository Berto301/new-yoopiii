import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { notifyApiErrors } from "../../../lib/errors/api-error.js";
import { useContractsWorkspace } from "../../../features/contracts/useContractsWorkspace.js";
import { ModalManageContract } from "./ModalManageContract.jsx";
import { ModalDeleteContract } from "./ModalDeleteContract.jsx";

const statCards = [
  { key: "total", label: "Contrats", description: "Cadres contractuels suivis dans votre portefeuille." },
  { key: "active", label: "Actifs", description: "Contrats actuellement valides pour gerer un bien." },
  { key: "documents", label: "Documents", description: "Pieces juridiques et administratives associees." }
];

export const ContractsPage = () => {
  const {
    user,
    contractsQuery,
    ownersQuery,
    propertyOptionsQuery,
    agentOptionsQuery,
    createContractMutation,
    updateContractMutation,
    deleteContractMutation,
    uploadContractDocumentMutation
  } = useContractsWorkspace();
  const { showError, showSuccess } = useNotification();
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [modalState, setModalState] = useState({ open: false, mode: "create", contract: null });
  const [deleteModalState, setDeleteModalState] = useState({ open: false, contract: null });
  const isOwnerActor = user?.role === "proprietaire";
  const isManagerActor = ["agency", "agency_agent", "independent_agent"].includes(user?.role || "");

  useEffect(() => {
    if (!selectedContractId && contractsQuery.data?.length) {
      setSelectedContractId(contractsQuery.data[0].id);
    }
  }, [contractsQuery.data, selectedContractId]);

  const selectedContract = useMemo(
    () => (contractsQuery.data || []).find((item) => item.id === selectedContractId) || null,
    [contractsQuery.data, selectedContractId]
  );

  const ownerOptions = useMemo(
    () => (ownersQuery.data || []).map((owner) => ({ label: `${owner.fullName} • ${owner.email || owner.phone || "sans contact"}`, value: owner.id })),
    [ownersQuery.data]
  );
  const propertyOptions = useMemo(
    () => (propertyOptionsQuery.data || []).map((property) => ({
      label: property.label,
      value: property.id,
      purpose: property.purpose,
      price: property.price,
      currency: property.currency
    })),
    [propertyOptionsQuery.data]
  );
  const agentOptions = useMemo(
    () => (agentOptionsQuery.data || []).map((agent) => ({ label: `${agent.label}${agent.email ? ` • ${agent.email}` : ""}`, value: agent.id })),
    [agentOptionsQuery.data]
  );
  const agencyOptions = useMemo(
    () => (user?.agencyId ? [{ label: "Agence courante", value: user.agencyId }] : []),
    [user?.agencyId]
  );

  if (!user || !["agency", "agency_agent", "independent_agent", "proprietaire"].includes(user.role)) {
    return <Navigate to="/dashboard/user" replace />;
  }

  const contracts = contractsQuery.data || [];
  const summary = {
    total: contracts.length,
    active: contracts.filter((item) => item.isActive).length,
    documents: contracts.reduce((sum, item) => sum + (item.documents?.length || 0), 0)
  };

  const handleSubmitContract = async (payload) => {
    try {
      const saved = modalState.mode === "edit" && modalState.contract
        ? await updateContractMutation.mutateAsync({ contractId: modalState.contract.id, payload })
        : await createContractMutation.mutateAsync(payload);

      setSelectedContractId(saved.id);
      setModalState({ open: false, mode: "create", contract: null });
      showSuccess(modalState.mode === "edit" ? "Contrat mis a jour." : "Contrat cree avec succes.");
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La gestion du contrat a echoue." });
    }
  };

  const handleDeleteContract = async () => {
    if (!deleteModalState.contract) return;
    try {
      await deleteContractMutation.mutateAsync(deleteModalState.contract.id);
      setSelectedContractId(null);
      setDeleteModalState({ open: false, contract: null });
      showSuccess("Contrat supprime. Les biens associes ont ete conserves.");
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La suppression du contrat a echoue." });
    }
  };

  const handleUploadDocument = async ({ kind, contractId, file }) => {
    const uploadedDocument = await uploadContractDocumentMutation.mutateAsync({ kind, contractId, file });
    showSuccess(
      file?.name
        ? `${file.name} televerse dans les documents du contrat.`
        : "Document televerse avec succes."
    );
    return uploadedDocument;
  };

  const handleContractStatusChange = async (contract, status, successMessage) => {
    try {
      const saved = await updateContractMutation.mutateAsync({
        contractId: contract.id,
        payload: { status }
      });

      setSelectedContractId(saved.id);
      setModalState({ open: false, mode: "create", contract: null });
      showSuccess(successMessage);
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "La mise a jour du statut du contrat a echoue." });
    }
  };

  const handleRefuseContract = async (contract) => {
    try {
      await updateContractMutation.mutateAsync({
        contractId: contract.id,
        payload: { status: "terminated" }
      });

      setSelectedContractId(null);
      setModalState({ open: false, mode: "create", contract: null });
      showSuccess("Contrat refuse. Il reste visible comme resilie chez le proprietaire.");
    } catch (error) {
      notifyApiErrors({ error, showError, fallbackMessage: "Le refus du contrat a echoue." });
    }
  };

  const modalFooterContent = !isOwnerActor && modalState.contract ? (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="secondary" className="px-5 py-3" onClick={() => setModalState({ open: false, mode: "create", contract: null })}>
        Fermer
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="px-5 py-3 text-red-200"
        disabled={updateContractMutation.isPending || modalState.contract.status === "terminated"}
        onClick={() => handleRefuseContract(modalState.contract)}
      >
        Refuser
      </Button>
      <Button
        type="button"
        className="px-5 py-3"
        disabled={updateContractMutation.isPending || modalState.contract.status === "terminated"}
        onClick={() => handleContractStatusChange(modalState.contract, "accepted", "Contrat accepte.")}
      >
        Accepter
      </Button>
    </div>
  ) : null;

  return (
    <>
      <section className="space-y-8">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-0">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-5">
              <SectionTitle
                eyebrow="Mes contrats"
                title="Cadrez juridiquement la gestion de vos biens"
                description="Retrouvez vos contrats, les proprietaires lies, les biens couverts, les statuts et les informations de gestion dans une interface plus moderne et reutilisable."
              />
              <div className="flex flex-wrap gap-3">
                {isOwnerActor ? (
                  <Button type="button" onClick={() => setModalState({ open: true, mode: "create", contract: null })}>Nouveau contrat</Button>
                ) : (
                  <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-100">
                    Creation reservee au proprietaire
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {statCards.map((card) => (
                <Card key={card.key} className="border-white/10 bg-black/20">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{summary[card.key]}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{card.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </Card>

        {contractsQuery.isLoading ? (
          <Card className="border-white/10 bg-white/5">
            <p className="text-sm text-stone-300">Chargement des contrats...</p>
          </Card>
        ) : contractsQuery.isError ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <p className="text-sm text-red-200">Impossible de charger les contrats.</p>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              {contracts.map((contract) => (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => setSelectedContractId(contract.id)}
                  className={selectedContractId === contract.id
                    ? "w-full rounded-[1.8rem] border border-brand-500/30 bg-brand-500/10 p-5 text-left"
                    : "w-full rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.06]"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{contract.reference}</p>
                      <p className="mt-1 text-sm capitalize text-stone-400">{contract.contractType}</p>
                    </div>
                    <Badge className={contract.isActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-stone-200"}>
                      {contract.statusLabel}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-stone-300">
                    <p><span className="text-stone-500">Proprietaire:</span> {contract.owner?.fullName || "-"}</p>
                    <p><span className="text-stone-500">Gestionnaire:</span> {contract.manager?.name || "-"}</p>
                    <p><span className="text-stone-500">Locataire principal:</span> {contract.mainTenant?.fullName || "Sans locataire"}</p>
                    <p><span className="text-stone-500">Dates:</span> {contract.startDateLabel} - {contract.endDateLabel}</p>
                  </div>
                </button>
              ))}
            </div>

            <Card className="border-white/10 bg-white/[0.04]">
              {selectedContract ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">Detail contrat</p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{selectedContract.reference}</h3>
                      <p className="mt-2 text-sm capitalize text-stone-400">{selectedContract.contractType}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isOwnerActor ? (
                        <>
                          <Button type="button" variant="secondary" onClick={() => setModalState({ open: true, mode: "edit", contract: selectedContract })}>Modifier</Button>
                          <Button type="button" variant="ghost" className="text-red-200" onClick={() => setDeleteModalState({ open: true, contract: selectedContract })}>Supprimer</Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="secondary" onClick={() => setModalState({ open: true, mode: "edit", contract: selectedContract })}>Examiner</Button>
                          <Button
                            type="button"
                            className="px-4 py-2"
                            disabled={updateContractMutation.isPending || selectedContract.status === "terminated"}
                            onClick={() => handleContractStatusChange(selectedContract, "accepted", "Contrat accepte.")}
                          >
                            Accepter
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-red-200"
                            disabled={updateContractMutation.isPending || selectedContract.status === "terminated"}
                            onClick={() => handleRefuseContract(selectedContract)}
                          >
                            Refuser
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Proprietaire</p>
                      <p className="mt-2 text-sm font-medium text-white">{selectedContract.owner?.fullName || "-"}</p>
                      <p className="mt-1 text-sm text-stone-400">{selectedContract.owner?.email || selectedContract.owner?.phone || ""}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Gestionnaire</p>
                      <p className="mt-2 text-sm font-medium text-white">{selectedContract.manager?.name || "-"}</p>
                      <p className="mt-1 text-sm text-stone-400">{selectedContract.manager?.label || ""}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Locataire principal</p>
                      <p className="mt-2 text-sm font-medium text-white">{selectedContract.mainTenant?.fullName || "Sans locataire"}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Loyer</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {selectedContract.financial?.rentAmount
                          ? `${Number(selectedContract.financial.rentAmount).toLocaleString("fr-FR")} ${selectedContract.financial.currency || ""}`.trim()
                          : "-"}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Debut</p>
                      <p className="mt-2 text-sm font-medium text-white">{selectedContract.startDateLabel}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Fin</p>
                      <p className="mt-2 text-sm font-medium text-white">{selectedContract.endDateLabel}</p>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Biens couverts</p>
                      {(selectedContract.coveredProperties || []).length ? (
                        selectedContract.coveredProperties.map((property) => (
                          <div key={property.id} className="rounded-[1.4rem] border border-white/10 bg-stone-950/60 px-4 py-4">
                            <p className="font-medium text-white">{property.title}</p>
                            <p className="mt-1 text-sm text-stone-400">{property.address}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-stone-950/40 px-4 py-6 text-sm text-stone-400">
                          Aucun bien encore rattache.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Documents associes</p>
                      {(selectedContract.documents || []).length ? (
                        selectedContract.documents.map((document) => (
                          <a key={document.id} href={document.publicPath} target="_blank" rel="noreferrer" className="block rounded-[1.4rem] border border-white/10 bg-stone-950/60 px-4 py-4 transition hover:border-white/20">
                            <p className="font-medium text-white">{document.originalName}</p>
                            <p className="mt-1 text-sm text-stone-400">{document.kindLabel}</p>
                          </a>
                        ))
                      ) : (
                        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-stone-950/40 px-4 py-6 text-sm text-stone-400">
                          Aucune piece jointe pour ce contrat.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-stone-400">Selectionnez un contrat pour afficher son detail.</div>
              )}
            </Card>
          </div>
        )}
      </section>

      <ModalManageContract
        open={modalState.open}
        mode={modalState.mode}
        contract={modalState.contract}
        propertyOptions={propertyOptions}
        ownerOptions={ownerOptions}
        agencyOptions={agencyOptions}
        agentOptions={agentOptions}
        onUploadDocument={handleUploadDocument}
        onUploadError={(error) => notifyApiErrors({ error, showError, fallbackMessage: "Le televersement du document a echoue." })}
        onClose={() => setModalState({ open: false, mode: "create", contract: null })}
        onSubmit={handleSubmitContract}
        isSaving={createContractMutation.isPending || updateContractMutation.isPending}
        isUploadingDocument={uploadContractDocumentMutation.isPending}
        saveDisabled={isManagerActor}
        footerContent={modalFooterContent}
      />
      <ModalDeleteContract
        open={deleteModalState.open}
        contract={deleteModalState.contract}
        linkedPropertiesCount={deleteModalState.contract?.coveredProperties?.length || 0}
        onClose={() => setDeleteModalState({ open: false, contract: null })}
        onConfirm={handleDeleteContract}
        isDeleting={deleteContractMutation.isPending}
      />
    </>
  );
};
