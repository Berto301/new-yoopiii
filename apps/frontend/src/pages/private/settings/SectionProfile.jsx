import { Controller } from "react-hook-form";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import BlackTooltip from "../../../components/ui/BlackToolip.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { PasswordInput } from "../../../components/ui/PasswordInput.jsx";
import { Button } from "../../../components/ui/Button.jsx";
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

export const SectionProfile = ({
  profileForm,
  passwordForm,
  updateProfileMutation,
  changePasswordMutation,
  onProfileSubmit,
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

  return (
    <div className="space-y-6">
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
          <Controller
            name="lastName"
            control={profileForm.control}
            render={({ field }) => <Input label="Nom" {...field} />}
          />
          <Controller
            name="firstName"
            control={profileForm.control}
            render={({ field }) => <Input label="Prenom" {...field} />}
          />
          <Controller
            name="email"
            control={profileForm.control}
            render={({ field }) => <Input label="Email" type="email" {...field} />}
          />
          <Controller
            name="phone"
            control={profileForm.control}
            render={({ field }) => <Input label="Telephone" {...field} />}
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
            <Controller
              name="avatar"
              control={profileForm.control}
              render={({ field }) => <Input label="Photo de profil" placeholder="https://..." {...field} />}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={updateProfileMutation.isPending}>Enregistrer le profil</Button>
          </div>
        </form>
      </Card>

      <Card>
        <p className="text-sm font-medium text-white">Changement de mot de passe</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
          <Controller
            name="currentPassword"
            control={passwordForm.control}
            render={({ field }) => <PasswordInput label="Mot de passe actuel" {...field} />}
          />
          <Controller
            name="newPassword"
            control={passwordForm.control}
            render={({ field }) => <PasswordInput label="Nouveau mot de passe" {...field} />}
          />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={changePasswordMutation.isPending}>Changer le mot de passe</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
