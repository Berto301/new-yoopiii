import { ModalDelete } from "../../../components/layout/modals/ModalDelete.jsx";

export const ModalDeleteTicket = ({
  open,
  ticket,
  onClose,
  onConfirm,
  isDeleting = false
}) => (
  <ModalDelete
    open={open}
    title="Supprimer le ticket"
    content={`Le ticket ${ticket?.title || ""} sera supprime. Cette action est definitive.`.trim()}
    onClose={onClose}
    onConfirm={onConfirm}
    isDeleting={isDeleting}
  />
);
