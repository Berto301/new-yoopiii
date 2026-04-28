import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
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
import { DEFAULT_SMART_MATCHING } from "../../../features/matching/matching.constants.js";
import { buildSmartMatchingPayload, normalizeSmartMatchingPreferences } from "../../../features/matching/matching.utils.js";

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
    updatePreferencesMutation,
    uploadAvatarMutation,
    changePasswordMutation,
    linkProviderMutation,
    unlinkProviderMutation,
    enableTwoFactorMutation,
    verifyTwoFactorMutation,
    disableTwoFactorMutation,
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
  const { t } = useUserPreferences();
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
      cin: "",
      adresse: "",
      sexe: "",
      avatar: ""
    }
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: ""
    }
  });

  const preferencesForm = useForm({
    defaultValues: {
      language: "fr",
      theme: true,
      currency: "USD",
      notificationsEnabled: true,
      pushNotificationsEnabled: false,
      contractDefaultCommission: 0,
      smartMatching: DEFAULT_SMART_MATCHING
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
        cin: profileQuery.data.cin || "",
        adresse: profileQuery.data.adresse || "",
        sexe: profileQuery.data.sexe || "",
        avatar: profileQuery.data.avatar || ""
      });

      preferencesForm.reset({
        language: profileQuery.data.preferences?.language || "fr",
        theme: (profileQuery.data.preferences?.theme || "dark") === "dark",
        currency: profileQuery.data.preferences?.currency || "USD",
        notificationsEnabled: profileQuery.data.preferences?.notificationsEnabled ?? true,
        pushNotificationsEnabled: profileQuery.data.preferences?.pushNotificationsEnabled ?? false,
        contractDefaultCommission: Number(profileQuery.data.preferences?.contractDefaultCommission ?? 0),
        smartMatching: normalizeSmartMatchingPreferences(
          profileQuery.data.preferences?.smartMatching || profileQuery.data.preferences?.intelligentMatching
        )
      });
    }
  }, [preferencesForm, profileForm, profileQuery.data]);

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

  const tabItems = useMemo(() => ([
    { id: "profile", label: t("settings", "tabs.profile", "Profil"), permission: PERMISSION_IDS.UI_TAB_SETTINGS_PROFILE },
    { id: "roles", label: t("settings", "tabs.roles", "Roles"), permission: PERMISSION_IDS.UI_TAB_SETTINGS_ROLES },
    { id: "members", label: t("settings", "tabs.members", "Agents"), permission: PERMISSION_IDS.UI_TAB_SETTINGS_MEMBERS },
    { id: "agency", label: t("settings", "tabs.agency", "Agence"), permission: PERMISSION_IDS.UI_TAB_SETTINGS_AGENCY }
  ]), [t]);

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
      return t("settings", "labels.ownerRole", "Proprietaire");
    }

    const matchingRole = (rolesQuery.data || []).find((role) => role._id === user?.permissionId || role.key === currentRoleKey);
    return matchingRole?.name || currentRoleKey || user?.role || "";
  }, [currentRoleKey, rolesQuery.data, t, user?.permissionId, user?.role]);

  const currentPermissionDetails = useMemo(() => user?.permissions || profileQuery.data?.permissions || [], [profileQuery.data?.permissions, user?.permissions]);

  useEffect(() => {
    if (!allowedTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(allowedTabs[0]?.id || "profile");
    }
  }, [activeTab, allowedTabs]);

  const handleProfileSubmit = async (values) => {
    try {
      await updateProfileMutation.mutateAsync(values);
      showSuccess("profile.updated", { translate: true, page: "messages", fallback: "Profil mis a jour avec succes." });
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.profileUpdate", "La mise a jour du profil a echoue.")));
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      const updatedUser = await uploadAvatarMutation.mutateAsync(file);
      profileForm.setValue("avatar", updatedUser.avatar || "", { shouldDirty: false, shouldValidate: false });
      showSuccess("profile.avatarUpdated", { translate: true, page: "messages", fallback: "Photo de profil mise a jour avec succes." });
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.avatarUpload", "Le televersement de la photo a echoue.")));
      throw error;
    }
  };

  const handlePasswordSubmit = async (values) => {
    try {
      await changePasswordMutation.mutateAsync(values);
      passwordForm.reset({ currentPassword: "", newPassword: "" });
      showSuccess("profile.passwordUpdated", { translate: true, page: "messages", fallback: "Mot de passe modifie avec succes." });
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.passwordUpdate", "Le changement de mot de passe a echoue.")));
    }
  };

  const handlePreferencesSubmit = async (values) => {
    try {
      await updatePreferencesMutation.mutateAsync({
        language: values.language,
        theme: values.theme ? "dark" : "light",
        currency: values.currency,
        notificationsEnabled: Boolean(values.notificationsEnabled),
        pushNotificationsEnabled: Boolean(values.pushNotificationsEnabled),
        contractDefaultCommission: Number(values.contractDefaultCommission || 0),
        smartMatching: buildSmartMatchingPayload(values.smartMatching)
      });

      showSuccess("preferences.saved", {
        translate: true,
        page: "messages",
        fallback: "Parametres enregistres avec succes."
      });
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.preferencesUpdate", "La mise a jour des parametres a echoue.")));
    }
  };

  const handleCaptureSmartMatchingLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showError("La geolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      preferencesForm.setValue("smartMatching.location.enabled", true, { shouldDirty: true, shouldValidate: false });
      preferencesForm.setValue("smartMatching.location.lat", Number(position.coords.latitude.toFixed(6)), { shouldDirty: true, shouldValidate: false });
      preferencesForm.setValue("smartMatching.location.lng", Number(position.coords.longitude.toFixed(6)), { shouldDirty: true, shouldValidate: false });
      preferencesForm.setValue(
        "smartMatching.location.label",
        `Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`,
        { shouldDirty: true, shouldValidate: false }
      );
      showSuccess("Position enregistree pour le matching intelligent.");
    } catch (_error) {
      showError("Impossible de recuperer votre position actuelle.");
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
      showSuccess("agency.updated", { translate: true, page: "messages", fallback: "Agence mise a jour avec succes." });
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.agencyUpdate", "La mise a jour de l'agence a echoue.")));
    }
  };

  const handleAgencyAssetUpload = async (assetKind, file) => {
    try {
      const updatedAgency = await uploadAgencyAssetMutation.mutateAsync({ assetKind, file });
      const targetField = assetKind === "cover" ? "coverImage" : "logo";
      const nextValue = assetKind === "cover" ? updatedAgency.coverImage || "" : updatedAgency.logo || "";

      agencyForm.setValue(targetField, nextValue, { shouldDirty: false, shouldValidate: false });
      showSuccess(assetKind === "cover" ? "agency.coverUpdated" : "agency.logoUpdated", {
        translate: true,
        page: "messages",
        fallback: assetKind === "cover" ? "Couverture mise a jour avec succes." : "Logo mis a jour avec succes."
      });
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.agencyAssetUpload", "Le televersement de l'image a echoue.")));
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
        showSuccess("members.updated", { translate: true, page: "messages", fallback: "Agent mis a jour avec succes." });
      } else {
        await createMemberMutation.mutateAsync({
          userId: values.userId,
          ...payload
        });
        showSuccess("members.created", { translate: true, page: "messages", fallback: "Agent ajoute avec succes." });
      }

      closeMemberModal();
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.memberUpdate", "La gestion de l'agent a echoue.")));
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
      showSuccess("members.deleted", { translate: true, page: "messages", fallback: "Agent supprime avec succes." });
    } catch (error) {
      showError(extractErrorMessage(error, t("messages", "errors.memberDelete", "La suppression de l'agent a echoue.")));
    }
  };

  const sections = {
    profile: (
      <SectionProfile
        profileForm={profileForm}
        profile={profileQuery.data}
        passwordForm={passwordForm}
        preferencesForm={preferencesForm}
        updateProfileMutation={updateProfileMutation}
        updatePreferencesMutation={updatePreferencesMutation}
        uploadAvatarMutation={uploadAvatarMutation}
        changePasswordMutation={changePasswordMutation}
        linkProviderMutation={linkProviderMutation}
        unlinkProviderMutation={unlinkProviderMutation}
        enableTwoFactorMutation={enableTwoFactorMutation}
        verifyTwoFactorMutation={verifyTwoFactorMutation}
        disableTwoFactorMutation={disableTwoFactorMutation}
        onProfileSubmit={handleProfileSubmit}
        onPreferencesSubmit={handlePreferencesSubmit}
        onAvatarUpload={handleAvatarUpload}
        onPasswordSubmit={handlePasswordSubmit}
        onCaptureSmartMatchingLocation={handleCaptureSmartMatchingLocation}
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
        <SectionTitle
          eyebrow={t("settings", "page.eyebrow", "Parametres")}
          title={t("settings", "page.title", "Gestion de profil")}
          description={t("settings", "page.description", "Mettez a jour votre profil connecte et votre mot de passe.")}
        />
        {sections.profile}
      </section>
    );
  }

  return (
    <>
      <section className="space-y-8">
        <SectionTitle
          eyebrow={t("settings", "page.eyebrow", "Parametres")}
          title={t("settings", "page.agencyTitle", "Administration agence")}
          description={t("settings", "page.agencyDescription", "Profil connecte, mot de passe, roles, agents et informations agence centralises dans un seul espace.")}
        />

        <nav className="flex flex-wrap gap-3" aria-label={t("settings", "page.eyebrow", "Parametres")}>
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
