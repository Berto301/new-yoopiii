import { ModalDelete } from "../../../components/layout/modals/ModalDelete.jsx";

export const ModalDeleteContract = ({
  open,
  contract,
  linkedPropertiesCount = 0,
  onClose,
  onConfirm,
  isDeleting = false
}) => (
  <ModalDelete
    open={open}
    title="Supprimer le contrat"
    content={`Le contrat ${contract?.reference || ""} va etre supprime. Les ${linkedPropertiesCount || 0} bien(s) associe(s) seront conserves et detaches du contrat. Cette action est definitive.`.trim()}
    onClose={onClose}
    onConfirm={onConfirm}
    isDeleting={isDeleting}
  />
);
