import { Controller } from "react-hook-form";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import BlackTooltip from "../../../components/ui/BlackToolip.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { PasswordInput } from "../../../components/ui/PasswordInput.jsx";
import { Profile } from "../../../features/settings/components/Profile.jsx";
import { PERMISSION_TREE } from "../../../helpers/constants.js";

const buildPermissionSections = (permissionCodes = []) =>
  PERMISSION_TREE.map((group) => ({
    title: group.label,
    items: (group.children || [])
      .filter((item) => permissionCodes.includes(item.value))
      .map((item) => item.label)
  })).filter((group) => group.items.length);

const PermissionTooltipContent = ({ permissionCodes }) => {
  const sections = buildPermissionSections(permissionCodes);

  if (!sections.length) {
    return <div>Aucune permission specifique.</div>;
  }

  return (
    <div className="w-[320px] space-y-3">
      <div className="border-b border-white/10 pb-2">
        <p className="text-sm font-semibold text-white">Permissions actives</p>
        <p className="mt-1 text-[11px] text-stone-300">Routes, modules et sections accessibles pour ce role.</p>
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl bg-white/5 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-200">{section.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {section.items.map((label) => (
                <span
                  key={`${section.title}-${label}`}
                  className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] leading-4 text-stone-100"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const genderOptions = [
  { label: "Homme", value: "homme" },
  { label: "Femme", value: "femme" },
  { label: "Autre", value: "autre" }
];

export const SectionProfile = ({
  profile,
  profileForm,
  passwordForm,
  updateProfileMutation,
  uploadAvatarMutation,
  changePasswordMutation,
  onProfileSubmit,
  onAvatarUpload,
  onPasswordSubmit,
  roleOptions = [],
  currentRoleKey = "",
  currentRoleLabel = "",
  permissionDetails = [],
  roleMode = "input"
}) => {
  const currentRoleOption =
    roleOptions.find((role) => role.key === currentRoleKey) ||
    (currentRoleLabel ? { _id: currentRoleKey || currentRoleLabel, key: currentRoleKey, name: currentRoleLabel } : null);

  const profileErrors = profileForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;
  const currentAvatar = profileForm.watch("avatar") || profile?.avatar || "";
  const userName = [profileForm.watch("firstName") || profile?.firstName, profileForm.watch("lastName") || profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Utilisateur";

  return (
    <div className="space-y-6">
      <Profile
        userName={userName}
        userEmail={profileForm.watch("email") || profile?.email || "Email non renseigne"}
        roleLabel={currentRoleLabel}
        permissionCount={permissionDetails.length}
        avatar={currentAvatar}
        isUploading={uploadAvatarMutation.isPending}
        onUpload={onAvatarUpload}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">Informations personnelles</p>
            <h3 className="text-xl font-semibold text-white">Coordonnees du compte</h3>
            <p className="text-sm text-stone-300">Modifiez vos informations de contact sans melanger la gestion de la photo de profil.</p>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <Controller
              name="lastName"
              control={profileForm.control}
              render={({ field }) => <Input label="Nom" error={profileErrors.lastName?.message} {...field} />}
            />
            <Controller
              name="firstName"
              control={profileForm.control}
              render={({ field }) => <Input label="Prenom" error={profileErrors.firstName?.message} {...field} />}
            />
            <Controller
              name="email"
              control={profileForm.control}
              render={({ field }) => <Input label="Email" type="email" error={profileErrors.email?.message} {...field} />}
            />
            <Controller
              name="phone"
              control={profileForm.control}
              render={({ field }) => <Input label="Telephone" error={profileErrors.phone?.message} {...field} />}
            />
            <Controller
              name="cin"
              control={profileForm.control}
              render={({ field }) => <Input label="CIN" error={profileErrors.cin?.message} {...field} />}
            />
            <Controller
              name="adresse"
              control={profileForm.control}
              render={({ field }) => <Input label="Adresse" error={profileErrors.adresse?.message} {...field} />}
            />
            <Controller
              name="sexe"
              control={profileForm.control}
              render={({ field }) => (
                <BaseListBox
                  label="Sexe"
                  options={genderOptions}
                  value={genderOptions.find((option) => option.value === field.value) || null}
                  onChange={(nextValue) => field.onChange(nextValue?.value || "")}
                  error={profileErrors.sexe?.message}
                  placeholder="Selectionner"
                />
              )}
            />
            <div className="md:col-span-2 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <BlackTooltip title={<PermissionTooltipContent permissionCodes={permissionDetails} />} arrow placement="top">
                <div>
                  {roleMode === "select" ? (
                    <BaseListBox
                      label="Role"
                      value={currentRoleOption}
                      onChange={() => {}}
                      options={roleOptions}
                      optionLabelKey="name"
                      optionValueKey="key"
                      disabled
                    />
                  ) : (
                    <Input label="Role" value={currentRoleLabel} readOnly />
                  )}
                </div>
              </BlackTooltip>
              {/* <Input
                label="Statut photo"
                value={currentAvatar ? "Photo personnalisee active" : "Image par defaut active"}
                readOnly
              /> */}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={updateProfileMutation.isPending}>Enregistrer le profil</Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">Securite</p>
            <h3 className="text-xl font-semibold text-white">Mot de passe</h3>
            <p className="text-sm text-stone-300">Choisissez un mot de passe distinct de l'actuel pour renforcer la securite du compte.</p>
          </div>

          <form className="grid gap-4" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <Controller
              name="currentPassword"
              control={passwordForm.control}
              render={({ field }) => <PasswordInput label="Mot de passe actuel" error={passwordErrors.currentPassword?.message} {...field} />}
            />
            <Controller
              name="newPassword"
              control={passwordForm.control}
              render={({ field }) => <PasswordInput label="Nouveau mot de passe" error={passwordErrors.newPassword?.message} {...field} />}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" disabled={changePasswordMutation.isPending}>
                Changer le mot de passe
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

