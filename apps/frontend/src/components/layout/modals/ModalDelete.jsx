import { ModalLayout } from "./ModalLayout.jsx";

export const ModalDelete = ({
  open,
  title,
  content = "Est ce que vous aimeriez supprimer le message ?",
  onClose,
  onConfirm,
  isDeleting = false
}) => (
  <ModalLayout
    open={open}
    title={title}
    onClose={onClose}
    onSave={onConfirm}
    saveLabel={isDeleting ? "Suppression..." : "Supprimer"}
    cancelLabel="Annuler"
    isSaving={isDeleting}
  >
    <p className="text-sm leading-7 text-stone-300">{content}</p>
  </ModalLayout>
);
