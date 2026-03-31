import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { SectionTitle } from "../../../components/shared/SectionTitle.jsx";
import { useSettingsWorkspace } from "../../../features/settings/hooks/useSettingsWorkspace.js";
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

export const SettingsPage = () => {
  const {
    user,
    profileQuery,
    rolesQuery,
    membersQuery,
    updateProfileMutation,
    changePasswordMutation,
    updateAgencyMutation
  } = useSettingsWorkspace();
  const [activeTab, setActiveTab] = useState("profile");

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
      name: user?.companyName || "",
      logo: "",
      coverImage: "",
      description: "",
      contactEmail: profileQuery.data?.email || "",
      contactPhone: profileQuery.data?.phone || "",
      address: ""
    };
  }, [profileQuery.data?.email, profileQuery.data?.phone, user?.companyName, user?.role]);

  useEffect(() => {
    if (agencyProfile) {
      agencyForm.reset(agencyProfile);
    }
  }, [agencyForm, agencyProfile]);

  const sections = {
    profile: (
      <SectionProfile
        profileForm={profileForm}
        passwordForm={passwordForm}
        updateProfileMutation={updateProfileMutation}
        changePasswordMutation={changePasswordMutation}
      />
    ),
    roles: <SectionRoles roles={rolesQuery.data || []} />,
    members: <SectionMembers members={membersQuery.data || []} />,
    agency: <SectionAgency agencyForm={agencyForm} updateAgencyMutation={updateAgencyMutation} />
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
  );
};

export default SettingsPage;

