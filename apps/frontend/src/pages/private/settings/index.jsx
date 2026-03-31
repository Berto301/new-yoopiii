import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { useNotification } from "../../../hooks/useNotification.js";
import { useSettingsWorkspace } from "../../../features/settings/hooks/useSettingsWorkspace.js";
import { DeleteAgencyModal } from "./DeleteAgencyModal.jsx";
import { SectionAgency } from "./SectionAgency.jsx";
import { SectionMembers } from "./SectionMembers.jsx";
import { SectionProfile } from "./SectionProfile.jsx";
import { SectionRoles } from "./SectionRoles.jsx";
import { SettingsTabButton } from "./SettingsTabButton.jsx";

const tabItems = [
  { id: "profile", label: "Profil" },
  { id: "roles", label: "Roles" },
  { id: "members", label: "Agents" },
  { id: "agency", label: "Agence" }
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
    changePasswordMutation,
    updateAgencyMutation,
    deleteAgencyMutation
  } = useSettingsWorkspace();
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState("profile");
  const [isDeleteAgencyModalOpen, setIsDeleteAgencyModalOpen] = useState(false);

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

  const agencyProfile = useMemo(() => {
    if (user?.role !== "agency") {
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
  }, [agencyQuery.data, profileQuery.data?.email, profileQuery.data?.phone, user?.role]);

  useEffect(() => {
    if (agencyProfile) {
      agencyForm.reset(agencyProfile);
    }
  }, [agencyForm, agencyProfile]);

  const handleProfileSubmit = async (values) => {
    try {
      await updateProfileMutation.mutateAsync(values);
      showSuccess("Profil mis a jour avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "La mise a jour du profil a echoue."));
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
        ...(normalizeText(values.logo) ? { logo: normalizeText(values.logo) } : { logo: null }),
        ...(normalizeText(values.coverImage)
          ? { coverImage: normalizeText(values.coverImage) }
          : { coverImage: null }),
        ...(normalizeText(values.description) ? { description: normalizeText(values.description) } : {}),
        ...(normalizeText(values.contactPhone) ? { contactPhone: normalizeText(values.contactPhone) } : {}),
        ...(normalizeText(values.address) ? { address: normalizeText(values.address) } : {})
      };

      await updateAgencyMutation.mutateAsync({ payload });
      showSuccess("Agence mise a jour avec succes.");
    } catch (error) {
      showError(extractErrorMessage(error, "La mise a jour de l'agence a echoue."));
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

  const sections = {
    profile: (
      <SectionProfile
        profileForm={profileForm}
        passwordForm={passwordForm}
        updateProfileMutation={updateProfileMutation}
        changePasswordMutation={changePasswordMutation}
        onProfileSubmit={handleProfileSubmit}
        onPasswordSubmit={handlePasswordSubmit}
      />
    ),
    roles: <SectionRoles roles={rolesQuery.data || []} />,
    members: <SectionMembers members={membersQuery.data || []} />,
    agency: (
      <SectionAgency
        agencyForm={agencyForm}
        updateAgencyMutation={updateAgencyMutation}
        isDeleteDisabled={deleteAgencyMutation.isPending}
        onDeleteClick={() => setIsDeleteAgencyModalOpen(true)}
        onAgencySubmit={handleAgencySubmit}
      />
    )
  };

  if (user?.role !== "agency") {
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
          {tabItems.map((tab) => (
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
    </>
  );
};

export default SettingsPage;
