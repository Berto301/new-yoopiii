import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { Badge } from "../../../components/ui/Badge.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { useContractsWorkspace } from "../../../features/contracts/useContractsWorkspace.js";
import { ModalAddNewContract } from "./ModalAddNewContract.jsx";

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
    () => (propertyOptionsQuery.data || []).map((property) => ({ label: property.label, value: property.id })),
    [propertyOptionsQuery.data]
  );
  const agentOptions = useMemo(
    () => (agentOptionsQuery.data || []).map((agent) => ({ label: `${agent.label}${agent.email ? ` • ${agent.email}` : ""}`, value: agent.id })),
    [agentOptionsQuery.data]
  );

  if (!user || !["agency", "independent_agent"].includes(user.role)) {
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
      showError(error?.response?.data?.message || "La gestion du contrat a echoue.");
    }
  };

  const handleDeleteContract = async (contract) => {
    const confirmed = window.confirm(`Supprimer le contrat ${contract.reference} ?`);
    if (!confirmed) return;

    try {
      await deleteContractMutation.mutateAsync(contract.id);
      setSelectedContractId(null);
      showSuccess("Contrat supprime.");
    } catch (error) {
      showError(error?.response?.data?.message || "La suppression du contrat a echoue.");
    }
  };

  const handleUploadDocument = async ({ kind, contractId, file }) => {
    try {
      const document = await uploadContractDocumentMutation.mutateAsync({ kind, contractId, file });
      showSuccess("Document televerse avec succes.");
      return document;
    } catch (error) {
      showError(error?.response?.data?.message || "Le televersement du document a echoue.");
      throw error;
    }
  };

  return (
    <>
      <section className="space-y-8">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-0">
          <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-5">
              <SectionTitle
                eyebrow="Mes contrats"
                title="Cadrez juridiquement la gestion de vos biens"
                description="Retrouvez vos contrats, les proprietaires lies, les biens couverts, les statuts, les dates critiques et l'ensemble des pieces juridiques dans un seul module plus professionnel."
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => setModalState({ open: true, mode: "create", contract: null })}>Nouveau contrat</Button>
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
                    : "w-full rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{contract.reference}</p>
                      <p className="mt-1 text-sm text-stone-400">{contract.contractType}</p>
                    </div>
                    <Badge className={contract.isActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-stone-200"}>
                      {contract.statusLabel}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-stone-300">
                    <p><span className="text-stone-500">Proprietaire:</span> {contract.owner?.fullName || "-"}</p>
                    <p><span className="text-stone-500">Agent responsable:</span> {contract.responsibleAgent?.fullName || "-"}</p>
                    <p><span className="text-stone-500">Biens couverts:</span> {contract.coveredProperties?.length || 0}</p>
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
                      <p className="mt-2 text-sm text-stone-400">{selectedContract.contractType}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => setModalState({ open: true, mode: "edit", contract: selectedContract })}>Modifier</Button>
                      <Button type="button" variant="ghost" className="text-red-200" onClick={() => handleDeleteContract(selectedContract)}>Supprimer</Button>
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
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agent responsable</p>
                      <p className="mt-2 text-sm font-medium text-white">{selectedContract.responsibleAgent?.fullName || "-"}</p>
                      <p className="mt-1 text-sm text-stone-400">{selectedContract.responsibleAgent?.email || ""}</p>
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
                          Aucun bien encore rattache. Ce contrat peut etre utilise pour debloquer la creation d'un bien sous mandat actif.
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

      <ModalAddNewContract
        open={modalState.open}
        mode={modalState.mode}
        contract={modalState.contract}
        ownerOptions={ownerOptions}
        propertyOptions={propertyOptions}
        agentOptions={agentOptions}
        onClose={() => setModalState({ open: false, mode: "create", contract: null })}
        onSubmit={handleSubmitContract}
        onUploadDocument={handleUploadDocument}
        isSaving={createContractMutation.isPending || updateContractMutation.isPending}
        isUploadingDocument={uploadContractDocumentMutation.isPending}
      />
    </>
  );
};
