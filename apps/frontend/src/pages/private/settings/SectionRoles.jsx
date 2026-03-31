import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { ModalManageRole } from "./ModalManageRole.jsx";

const slugifyRoleKey = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const extractErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

export const SectionRoles = ({ roles, createRoleMutation, updateRoleMutation, duplicateRoleMutation, deleteRoleMutation }) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const modalMode = useMemo(() => (editingRole ? "edit" : "create"), [editingRole]);
  const isSaving = createRoleMutation.isPending || updateRoleMutation.isPending;

  const openCreateModal = () => {
    setEditingRole(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role) => {
    if (role.isSystem || role.key === "owner") {
      showInfo("Le role owner ne peut pas etre modifie.");
      return;
    }

    setEditingRole(role);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingRole(null);
    setIsModalOpen(false);
  };

  const handleSubmitRole = async (values) => {
    const payload = {
      name: values.name.trim(),
      key: slugifyRoleKey(values.key || values.name),
      permissions: values.permissions
    };

    try {
      if (editingRole) {
        await updateRoleMutation.mutateAsync({ roleId: editingRole._id, payload });
        showSuccess("Role mis a jour avec succes.");
      } else {
        await createRoleMutation.mutateAsync(payload);
        showSuccess("Role cree avec succes.");
      }

      closeModal();
    } catch (error) {
      showError(extractErrorMessage(error, "La gestion du role a echoue."));
    }
  };

  const handleDuplicateRole = async (role) => {
    if (role.isSystem || role.key === "owner") {
      showInfo("Le role owner ne peut pas etre duplique.");
      return;
    }

    try {
      await duplicateRoleMutation.mutateAsync({
        roleId: role._id,
        payload: {
          name: `${role.name} copie`,
          key: `${slugifyRoleKey(role.key)}-copy`
        }
      });
      showSuccess("Role duplique avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "La duplication du role a echoue."));
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystem || role.key === "owner") {
      showInfo("Le role owner ne peut pas etre supprime.");
      return;
    }

    const confirmed = window.confirm(`Supprimer le role ${role.name} ?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteRoleMutation.mutateAsync(role._id);
      showSuccess("Role supprime avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "La suppression du role a echoue."));
    }
  };

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Gestion de Role</p>
            <p className="mt-1 text-sm text-stone-400">Gerez les roles, les routes, les pages et les sections accessibles.</p>
          </div>
          <Button type="button" onClick={openCreateModal}>Ajout Role</Button>
        </div>

        <div className="mt-6 space-y-3">
          {roles.map((role) => {
            const isOwnerRole = role.isSystem || role.key === "owner";
            const permissionCount = role.permissions?.length || 0;

            return (
              <div key={role._id} className="rounded-2xl border border-white/10 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{role.name}</p>
                    <p className="mt-1 text-sm text-stone-400">{role.key}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-100">{permissionCount} permissions</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={isOwnerRole} onClick={() => openEditModal(role)}>Modifier</Button>
                    <Button type="button" variant="secondary" disabled={isOwnerRole} onClick={() => handleDuplicateRole(role)}>Dupliquer</Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="border-red-500/40 text-red-200 hover:border-red-400 hover:bg-red-500/10"
                      disabled={isOwnerRole || deleteRoleMutation.isPending}
                      onClick={() => handleDeleteRole(role)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {!roles.length ? <p className="text-sm text-stone-400">Aucun role charge depuis le backend.</p> : null}
        </div>
      </Card>

      <ModalManageRole
        open={isModalOpen}
        mode={modalMode}
        initialRole={editingRole}
        isSaving={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmitRole}
      />
    </>
  );
};
