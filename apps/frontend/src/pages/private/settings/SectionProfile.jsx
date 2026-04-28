import { Controller } from "react-hook-form";
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS } from "../../../app/preferences/user-preferences.constants.js";
import { useUserPreferences } from "../../../app/preferences/UserPreferencesProvider.jsx";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import BlackTooltip from "../../../components/ui/BlackToolip.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { PasswordInput } from "../../../components/ui/PasswordInput.jsx";
import { Switch } from "../../../components/ui/Switch.jsx";
import { Profile } from "../../../features/settings/components/Profile.jsx";
import { PERMISSION_TREE } from "../../../helpers/constants.js";
import { SectionConnectionSettings } from "./SectionConnectionSettings.jsx";

const buildPermissionSections = (permissionCodes = []) =>
  PERMISSION_TREE.map((group) => ({
    title: group.label,
    items: (group.children || [])
      .filter((item) => permissionCodes.includes(item.value))
      .map((item) => item.label)
  })).filter((group) => group.items.length);

const PermissionTooltipContent = ({ permissionCodes }) => {
  const { t } = useUserPreferences();
  const sections = buildPermissionSections(permissionCodes);

  if (!sections.length) {
    return <div>{t("settings", "permissions.empty", "Aucune permission specifique.")}</div>;
  }

  return (
    <div className="w-[320px] space-y-3">
      <div className="border-b border-white/10 pb-2">
        <p className="text-sm font-semibold text-white">{t("settings", "permissions.title", "Permissions actives")}</p>
        <p className="mt-1 text-[11px] text-stone-300">{t("settings", "permissions.description", "Routes, modules et sections accessibles pour ce role.")}</p>
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
  profile,
  profileForm,
  passwordForm,
  preferencesForm,
  updateProfileMutation,
  updatePreferencesMutation,
  uploadAvatarMutation,
  changePasswordMutation,
  linkProviderMutation,
  unlinkProviderMutation,
  enableTwoFactorMutation,
  verifyTwoFactorMutation,
  disableTwoFactorMutation,
  onProfileSubmit,
  onPreferencesSubmit,
  onAvatarUpload,
  onPasswordSubmit,
  roleOptions = [],
  currentRoleKey = "",
  currentRoleLabel = "",
  permissionDetails = [],
  roleMode = "input"
}) => {
  const { t } = useUserPreferences();
  const genderOptions = [
    { label: t("settings", "profile.genderOptions.male", "Homme"), value: "homme" },
    { label: t("settings", "profile.genderOptions.female", "Femme"), value: "femme" },
    { label: t("settings", "profile.genderOptions.other", "Autre"), value: "autre" }
  ];
  const currentRoleOption =
    roleOptions.find((role) => role.key === currentRoleKey) ||
    (currentRoleLabel ? { _id: currentRoleKey || currentRoleLabel, key: currentRoleKey, name: currentRoleLabel } : null);

  const profileErrors = profileForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;
  const preferencesErrors = preferencesForm.formState.errors;
  const currentAvatar = profileForm.watch("avatar") || profile?.avatar || "";
  const canManageCommission = ["agency", "agency_agent", "independent_agent"].includes(profile?.role);
  const userName = [profileForm.watch("firstName") || profile?.firstName, profileForm.watch("lastName") || profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || t("settings", "labels.user", "Utilisateur");

  return (
    <div className="space-y-6">
      <Profile
        userName={userName}
        userEmail={profileForm.watch("email") || profile?.email || t("settings", "labels.emailMissing", "Email non renseigne")}
        roleLabel={currentRoleLabel}
        permissionCount={permissionDetails.length}
        avatar={currentAvatar}
        isUploading={uploadAvatarMutation.isPending}
        onUpload={onAvatarUpload}
      />

      <div className="flex flex-col">
        <div className="space-y-6">
          <Card className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">{t("settings", "profile.eyebrow", "Informations personnelles")}</p>
              <h3 className="text-xl font-semibold text-white">{t("settings", "profile.title", "Coordonnees du compte")}</h3>
              <p className="text-sm text-stone-300">{t("settings", "profile.description", "Modifiez vos informations de contact sans melanger la gestion de la photo de profil.")}</p>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              <Controller
                name="lastName"
                control={profileForm.control}
                render={({ field }) => <Input label={t("settings", "profile.lastName", "Nom")} error={profileErrors.lastName?.message} {...field} />}
              />
              <Controller
                name="firstName"
                control={profileForm.control}
                render={({ field }) => <Input label={t("settings", "profile.firstName", "Prenom")} error={profileErrors.firstName?.message} {...field} />}
              />
              <Controller
                name="email"
                control={profileForm.control}
                render={({ field }) => <Input label={t("settings", "profile.email", "Email")} type="email" error={profileErrors.email?.message} {...field} />}
              />
              <Controller
                name="phone"
                control={profileForm.control}
                render={({ field }) => <Input label={t("settings", "profile.phone", "Telephone")} error={profileErrors.phone?.message} {...field} />}
              />
              <Controller
                name="cin"
                control={profileForm.control}
                render={({ field }) => <Input label={t("settings", "profile.cin", "CIN")} error={profileErrors.cin?.message} {...field} />}
              />
              <Controller
                name="adresse"
                control={profileForm.control}
                render={({ field }) => <Input label={t("settings", "profile.address", "Adresse")} error={profileErrors.adresse?.message} {...field} />}
              />
              <Controller
                name="sexe"
                control={profileForm.control}
                render={({ field }) => (
                  <BaseListBox
                    label={t("settings", "profile.gender", "Sexe")}
                    options={genderOptions}
                    value={genderOptions.find((option) => option.value === field.value) || null}
                    onChange={(nextValue) => field.onChange(nextValue?.value || "")}
                    error={profileErrors.sexe?.message}
                    placeholder={t("settings", "profile.placeholder", "Selectionner")}
                  />
                )}
              />
              <div className="md:col-span-2 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <BlackTooltip title={<PermissionTooltipContent permissionCodes={permissionDetails} />} arrow placement="top">
                  <div>
                    {roleMode === "select" ? (
                      <BaseListBox
                        label={t("settings", "profile.role", "Role")}
                        value={currentRoleOption}
                        onChange={() => {}}
                        options={roleOptions}
                        optionLabelKey="name"
                        optionValueKey="key"
                        disabled
                      />
                    ) : (
                      <Input label={t("settings", "profile.role", "Role")} value={currentRoleLabel} readOnly />
                    )}
                  </div>
                </BlackTooltip>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={updateProfileMutation.isPending}>{t("settings", "profile.save", "Enregistrer le profil")}</Button>
              </div>
            </form>
          </Card>

          <Card className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">{t("settings", "account.eyebrow", "Parametres de compte")}</p>
              <h3 className="text-xl font-semibold text-white">{t("settings", "account.title", "Preferences globales")}</h3>
              <p className="text-sm text-stone-300">{t("settings", "account.description", "Choisissez la langue, le theme et la devise utilises dans tout votre espace.")}</p>
            </div>

            <form className="grid gap-4" onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)}>
              <Controller
                name="language"
                control={preferencesForm.control}
                render={({ field }) => (
                  <BaseListBox
                    label={t("settings", "account.language.label", "Langue")}
                    options={LANGUAGE_OPTIONS}
                    value={LANGUAGE_OPTIONS.find((option) => option.value === field.value) || null}
                    onChange={(nextValue) => field.onChange(nextValue?.value || "fr")}
                    error={preferencesErrors.language?.message}
                  />
                )}
              />
              <Controller
                name="theme"
                control={preferencesForm.control}
                render={({ field }) => (
                  <Switch
                    label={t("settings", "account.theme.label", "Theme")}
                    description={field.value ? t("settings", "account.theme.dark", "Dark Mode") : t("settings", "account.theme.light", "Light Mode")}
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    error={preferencesErrors.theme?.message}
                  />
                )}
              />
              <Controller
                name="currency"
                control={preferencesForm.control}
                render={({ field }) => (
                  <BaseListBox
                    label={t("settings", "account.currency.label", "Devise")}
                    options={CURRENCY_OPTIONS}
                    value={CURRENCY_OPTIONS.find((option) => option.value === field.value) || null}
                    onChange={(nextValue) => field.onChange(nextValue?.value || "USD")}
                    error={preferencesErrors.currency?.message}
                  />
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={updatePreferencesMutation.isPending}>
                  {t("settings", "actions.saveAccount", "Enregistrer les preferences")}
                </Button>
              </div>
            </form>
          </Card>

          {canManageCommission ? (
            <Card className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">{t("settings", "contract.eyebrow", "Contrat & Financier")}</p>
                <h3 className="text-xl font-semibold text-white">{t("settings", "contract.title", "Commission par defaut")}</h3>
                <p className="text-sm text-stone-300">{t("settings", "contract.description", "Cette valeur sera proposee automatiquement lors de la creation d'un contrat, tout en restant modifiable dans le formulaire.")}</p>
              </div>

              <form className="grid gap-4" onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)}>
                <Controller
                  name="contractDefaultCommission"
                  control={preferencesForm.control}
                  render={({ field }) => (
                    <Input
                      label={t("settings", "contract.commission.label", "Commission (%)")}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      error={preferencesErrors.contractDefaultCommission?.message}
                      {...field}
                    />
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={updatePreferencesMutation.isPending}>
                    {t("settings", "actions.saveFinancial", "Enregistrer contrat & financier")}
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          <Card className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-400">{t("settings", "security.eyebrow", "Securite")}</p>
              <h3 className="text-xl font-semibold text-white">{t("settings", "security.title", "Mot de passe")}</h3>
              <p className="text-sm text-stone-300">{t("settings", "security.description", "Choisissez un mot de passe distinct de l'actuel pour renforcer la securite du compte.")}</p>
            </div>

            <form className="grid gap-4" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <Controller
                name="currentPassword"
                control={passwordForm.control}
                render={({ field }) => <PasswordInput label={t("settings", "security.currentPassword", "Mot de passe actuel")} error={passwordErrors.currentPassword?.message} {...field} />}
              />
              <Controller
                name="newPassword"
                control={passwordForm.control}
                render={({ field }) => <PasswordInput label={t("settings", "security.newPassword", "Nouveau mot de passe")} error={passwordErrors.newPassword?.message} {...field} />}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" disabled={changePasswordMutation.isPending}>
                  {t("settings", "security.save", "Changer le mot de passe")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      <SectionConnectionSettings
        profile={profile}
        linkProviderMutation={linkProviderMutation}
        unlinkProviderMutation={unlinkProviderMutation}
        enableTwoFactorMutation={enableTwoFactorMutation}
        verifyTwoFactorMutation={verifyTwoFactorMutation}
        disableTwoFactorMutation={disableTwoFactorMutation}
      />
    </div>
  );
};

