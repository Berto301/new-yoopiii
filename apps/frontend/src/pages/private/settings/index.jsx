import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { PERMISSION_IDS } from "../../../helpers/constants.js";
import { hasPermission } from "../../../helpers/_functions.js";
import { useNotification } from "../../../hooks/useNotification.js";
import { useSettingsWorkspace } from "../../../features/settings/hooks/useSettingsWorkspace.js";
import { DeleteAgencyModal } from "./DeleteAgencyModal.jsx";
import { ModalManageMember } from "./ModalManageMember.jsx";
import { SectionAgency } from "./SectionAgency.jsx";
import { SectionMembers } from "./SectionMembers.jsx";
import { SectionProfile } from "./SectionProfile.jsx";
import { SectionRoles } from "./SectionRoles.jsx";
import { SettingsTabButton } from "./SettingsTabButton.jsx";

const tabItems = [
  { id: "profile", label: "Profil", permission: PERMISSION_IDS.UI_TAB_SETTINGS_PROFILE },
  { id: "roles", label: "Roles", permission: PERMISSION_IDS.UI_TAB_SETTINGS_ROLES },
  { id: "members", label: "Agents", permission: PERMISSION_IDS.UI_TAB_SETTINGS_MEMBERS },
  { id: "agency", label: "Agence", permission: PERMISSION_IDS.UI_TAB_SETTINGS_AGENCY }
];

const extractErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;
const normalizeText = (value) => (typeof value === "string" ? value.trim() : value);

export const SettingsPage = () => {
  const navigate = useNavigate();
  const {
    user,
    profileQuery,
    agencyQuery,
    rolesQuery,
    membersQuery,
    updateProfileMutation,
    uploadAvatarMutation,
    changePasswordMutation,
    updateAgencyMutation,
    uploadAgencyAssetMutation,
    createRoleMutation,
    updateRoleMutation,
    duplicateRoleMutation,
    deleteRoleMutation,
    createMemberMutation,
    updateMemberMutation,
    deleteMemberMutation,
    deleteAgencyMutation
  } = useSettingsWorkspace();
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState("profile");
  const [isDeleteAgencyModalOpen, setIsDeleteAgencyModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const profileForm = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      avatar: ""
    }
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: ""
    }
  });

  const agencyForm = useForm({
    defaultValues: {
      name: "",
      logo: "",
      coverImage: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: ""
    }
  });

  useEffect(() => {
    if (profileQuery.data) {
      profileForm.reset({
        firstName: profileQuery.data.firstName || "",
        lastName: profileQuery.data.lastName || "",
        email: profileQuery.data.email || "",
        phone: profileQuery.data.phone || "",
        avatar: profileQuery.data.avatar || ""
      });
    }
  }, [profileForm, profileQuery.data]);

  const isAgencyWorkspace = user?.role === "agency" || user?.role === "agency_agent";

  const agencyProfile = useMemo(() => {
    if (!isAgencyWorkspace) {
      return null;
    }

    return {
      name: agencyQuery.data?.name || "",
      logo: agencyQuery.data?.logo || "",
      coverImage: agencyQuery.data?.coverImage || "",
      description: agencyQuery.data?.description || "",
      contactEmail: agencyQuery.data?.contactEmail || profileQuery.data?.email || "",
      contactPhone: agencyQuery.data?.contactPhone || profileQuery.data?.phone || "",
      address: agencyQuery.data?.address || ""
    };
  }, [agencyQuery.data, isAgencyWorkspace, profileQuery.data?.email, profileQuery.data?.phone]);

  useEffect(() => {
    if (agencyProfile) {
      agencyForm.reset(agencyProfile);
    }
  }, [agencyForm, agencyProfile]);

  const allowedTabs = useMemo(() => {
    if (!isAgencyWorkspace) {
      return [tabItems[0]];
    }

    return tabItems.filter((tab) => hasPermission(user?.permissions, tab.permission));
  }, [isAgencyWorkspace, user?.permissions]);

  const currentAgencyMembership = useMemo(() => {
    if (!membersQuery.data?.length || !user?.id) {
      return null;
    }

    return membersQuery.data.find((member) => String(member.userId) === String(user.id)) || null;
  }, [membersQuery.data, user?.id]);

  const membersWithUserDetails = useMemo(() => {
    return (membersQuery.data || []).map((member) => {
      const matchingRole = (rolesQuery.data || []).find((role) => String(role._id) === String(member.permissionId) || role.key === member.role);

      return {
        ...member,
        roleLabel: matchingRole?.name || member.role
      };
    });
  }, [membersQuery.data, rolesQuery.data]);

  const currentRoleKey = useMemo(() => {
    if (user?.role === "agency") {
      return "owner";
    }

    if (currentAgencyMembership?.role) {
      return currentAgencyMembership.role;
    }

    return user?.role || "";
  }, [currentAgencyMembership?.role, user?.role]);

  const currentRoleLabel = useMemo(() => {
    if (user?.role === "agency") {
      return "owner";
    }

    const matchingRole = (rolesQuery.data || []).find((role) => role._id === user?.permissionId || role.key === currentRoleKey);
    return matchingRole?.name || currentRoleKey || user?.role || "";
  }, [currentRoleKey, rolesQuery.data, user?.permissionId, user?.role]);

  const currentPermissionDetails = useMemo(() => user?.permissions || profileQuery.data?.permissions || [], [profileQuery.data?.permissions, user?.permissions]);

  useEffect(() => {
    if (!allowedTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(allowedTabs[0]?.id || "profile");
    }
  }, [activeTab, allowedTabs]);

  const handleProfileSubmit = async (values) => {
    try {
      await updateProfileMutation.mutateAsync(values);
      showSuccess("Profil mis a jour avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "La mise a jour du profil a echoue."));
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      const updatedUser = await uploadAvatarMutation.mutateAsync(file);
      profileForm.setValue("avatar", updatedUser.avatar || "", { shouldDirty: false, shouldValidate: false });
      showSuccess("Photo de profil mise a jour avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "Le televersement de la photo a echoue."));
      throw error;
    }
  };

  const handlePasswordSubmit = async (values) => {
    try {
      await changePasswordMutation.mutateAsync(values);
      passwordForm.reset({ currentPassword: "", newPassword: "" });
      showSuccess("Mot de passe modifie avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "Le changement de mot de passe a echoue."));
    }
  };

  const handleAgencySubmit = async (values) => {
    try {
      const payload = {
        name: normalizeText(values.name),
        contactEmail: normalizeText(values.contactEmail),
        ...(normalizeText(values.description) ? { description: normalizeText(values.description) } : {}),
        ...(normalizeText(values.contactPhone) ? { contactPhone: normalizeText(values.contactPhone) } : { contactPhone: "" }),
        ...(normalizeText(values.address) ? { address: normalizeText(values.address) } : { address: "" })
      };

      await updateAgencyMutation.mutateAsync({ payload });
      showSuccess("Agence mise a jour avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "La mise a jour de l'agence a echoue."));
    }
  };

  const handleAgencyAssetUpload = async (assetKind, file) => {
    try {
      const updatedAgency = await uploadAgencyAssetMutation.mutateAsync({ assetKind, file });
      const targetField = assetKind === "cover" ? "coverImage" : "logo";
      const nextValue = assetKind === "cover" ? updatedAgency.coverImage || "" : updatedAgency.logo || "";

      agencyForm.setValue(targetField, nextValue, { shouldDirty: false, shouldValidate: false });
      showSuccess(assetKind === "cover" ? "Couverture mise a jour avec succes." : "Logo mis a jour avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "Le televersement de l'image a echoue."));
      throw error;
    }
  };

  const handleDeleteAgency = async () => {
    try {
      await deleteAgencyMutation.mutateAsync();
      setIsDeleteAgencyModalOpen(false);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("yopii-session");
      }

      navigate("/login", { replace: true });
    } catch (error) {
      showError(extractErrorMessage(error, "La suppression de l'agence a echoue."));
    }
  };

  const openCreateMemberModal = () => {
    setEditingMember(null);
    setIsMemberModalOpen(true);
  };

  const openEditMemberModal = (member) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  const closeMemberModal = () => {
    setEditingMember(null);
    setIsMemberModalOpen(false);
  };

  const handleSubmitMember = async (values) => {
    const payload = {
      user: {
        firstName: normalizeText(values.firstName),
        lastName: normalizeText(values.lastName),
        email: normalizeText(values.email),
        ...(normalizeText(values.phone) ? { phone: normalizeText(values.phone) } : {})
      },
      role: values.role,
      ...(values.permissionId ? { permissionId: values.permissionId } : {}),
      ...(values.status ? { status: values.status } : {}),
      ...(values.jobTitle ? { jobTitle: normalizeText(values.jobTitle) } : { jobTitle: "" })
    };

    try {
      if (editingMember?._id) {
        await updateMemberMutation.mutateAsync({
          memberId: editingMember._id,
          payload
        });
        showSuccess("Agent mis a jour avec succes.");
      } else {
        await createMemberMutation.mutateAsync({
          userId: values.userId,
          ...payload
        });
        showSuccess("Agent ajoute avec succes.");
      }

      closeMemberModal();
    } catch (error) {
      showError(extractErrorMessage(error, "La gestion de l'agent a echoue."));
    }
  };

  const handleDeleteMember = async (member) => {
    const memberLabel = [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || member.email || member.jobTitle || "cet agent";
    const confirmed = window.confirm(`Supprimer ${memberLabel} ?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteMemberMutation.mutateAsync(member._id);
      showSuccess("Agent supprime avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "La suppression de l'agent a echoue."));
    }
  };

  const sections = {
    profile: (
      <SectionProfile
        profileForm={profileForm}
        profile={profileQuery.data}
        passwordForm={passwordForm}
        updateProfileMutation={updateProfileMutation}
        uploadAvatarMutation={uploadAvatarMutation}
        changePasswordMutation={changePasswordMutation}
        onProfileSubmit={handleProfileSubmit}
        onAvatarUpload={handleAvatarUpload}
        onPasswordSubmit={handlePasswordSubmit}
        roleOptions={rolesQuery.data || []}
        currentRoleKey={currentRoleKey}
        currentRoleLabel={currentRoleLabel}
        permissionDetails={currentPermissionDetails}
        roleMode={isAgencyWorkspace ? "select" : "input"}
      />
    ),
    roles: (
      <SectionRoles
        roles={rolesQuery.data || []}
        createRoleMutation={createRoleMutation}
        updateRoleMutation={updateRoleMutation}
        duplicateRoleMutation={duplicateRoleMutation}
        deleteRoleMutation={deleteRoleMutation}
      />
    ),
    members: (
      <SectionMembers
        members={membersWithUserDetails}
        onAddMember={openCreateMemberModal}
        onEditMember={openEditMemberModal}
        onDeleteMember={handleDeleteMember}
        isDeletingMember={deleteMemberMutation.isPending}
      />
    ),
    agency: (
      <SectionAgency
        agencyForm={agencyForm}
        updateAgencyMutation={updateAgencyMutation}
        uploadAgencyAssetMutation={uploadAgencyAssetMutation}
        isDeleteDisabled={deleteAgencyMutation.isPending}
        onDeleteClick={() => setIsDeleteAgencyModalOpen(true)}
        onAgencySubmit={handleAgencySubmit}
        onAgencyAssetUpload={handleAgencyAssetUpload}
      />
    )
  };

  if (!isAgencyWorkspace) {
    return (
      <section className="space-y-8">
        <SectionTitle eyebrow="Parametres" title="Gestion de profile" description="Mettez a jour votre profile connecte et votre mot de passe." />
        {sections.profile}
      </section>
    );
  }

  return (
    <>
      <section className="space-y-8">
        <SectionTitle eyebrow="Parametres" title="Administration agence" description="Profil connecte, mot de passe, roles, agents et informations agence centralises dans un seul espace." />

        <nav className="flex flex-wrap gap-3" aria-label="Navigation des parametres">
          {allowedTabs.map((tab) => (
            <SettingsTabButton
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>

        <div key={activeTab}>{sections[activeTab] || sections.profile}</div>
      </section>

      <DeleteAgencyModal
        open={isDeleteAgencyModalOpen}
        isDeleting={deleteAgencyMutation.isPending}
        onClose={() => setIsDeleteAgencyModalOpen(false)}
        onConfirm={handleDeleteAgency}
      />

      <ModalManageMember
        open={isMemberModalOpen}
        mode={editingMember ? "edit" : "create"}
        initialMember={editingMember}
        roleOptions={rolesQuery.data || []}
        isSaving={createMemberMutation.isPending || updateMemberMutation.isPending}
        onClose={closeMemberModal}
        onSubmit={handleSubmitMember}
      />
    </>
  );
};

export default SettingsPage;
