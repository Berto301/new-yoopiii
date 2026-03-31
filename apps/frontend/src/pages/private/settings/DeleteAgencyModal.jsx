import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";

export const DeleteAgencyModal = ({ open, onClose, onConfirm, isDeleting }) => (
  <ModalLayout
    open={open}
    title="Suppression de l'agence"
    cancelLabel="Annuler"
    saveLabel="Confirmer"
    onClose={onClose}
    onSave={onConfirm}
    isSaving={isDeleting}
  >
    <div className="space-y-3 text-sm leading-7 text-stone-300">
      <p className="text-base font-medium text-white">Etes vous sur de supprimer cette agence ?</p>
      <p>
        Cette action supprimera l'agence, ses agents, ses notifications et toutes les donnees associees en
        cascade.
      </p>
    </div>
  </ModalLayout>
);
