import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { Input } from "../../../components/ui/Input.jsx";

const MEMBER_ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "agent", label: "Agent" },
  { value: "assistant", label: "Assistant" },
  { value: "viewer", label: "Viewer" }
];

const MEMBER_STATUS_OPTIONS = [
  { value: "invited", label: "Invite" },
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" }
];

const findOptionByValue = (options, value) => options.find((option) => String(option.value) === String(value)) || null;

export const ModalManageMember = ({
  open,
  mode = "create",
  initialMember = null,
  roleOptions = [],
  isSaving = false,
  onClose,
  onSubmit
}) => {
  const roleTemplateOptions = useMemo(
    () => [
      { value: "", label: "Aucun role personnalise" },
      ...roleOptions.map((role) => ({
        value: role._id,
        label: role.name
      }))
    ],
    [roleOptions]
  );

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      roleOption: MEMBER_ROLE_OPTIONS[2],
      statusOption: MEMBER_STATUS_OPTIONS[0],
      permissionOption: roleTemplateOptions[0] || null,
      jobTitle: ""
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      firstName: initialMember?.firstName || "",
      lastName: initialMember?.lastName || "",
      email: initialMember?.email || "",
      phone: initialMember?.phone || "",
      roleOption: findOptionByValue(MEMBER_ROLE_OPTIONS, initialMember?.role) || MEMBER_ROLE_OPTIONS[2],
      statusOption: findOptionByValue(MEMBER_STATUS_OPTIONS, initialMember?.status) || MEMBER_STATUS_OPTIONS[0],
      permissionOption: findOptionByValue(roleTemplateOptions, initialMember?.permissionId) || roleTemplateOptions[0] || null,
      jobTitle: initialMember?.jobTitle || ""
    });
  }, [initialMember, open, reset, roleTemplateOptions]);

  const title = mode === "edit" ? "Modifier un agent" : "Ajout agent";
  const selectedRole = watch("roleOption");
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const email = watch("email");

  const handleMemberSubmit = (values) =>
    onSubmit({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      role: values.roleOption?.value,
      permissionId: values.permissionOption?.value || undefined,
      status: values.statusOption?.value,
      jobTitle: values.jobTitle.trim()
    });

  return (
    <ModalLayout
      open={open}
      title={title}
      cancelLabel="Annuler"
      saveLabel={mode === "edit" ? "Enregistrer" : "Creer"}
      onClose={onClose}
      onSave={handleSubmit(handleMemberSubmit)}
      isSaving={isSaving}
      saveDisabled={!firstName?.trim() || !lastName?.trim() || !email?.trim() || !selectedRole}
    >
      <div className="space-y-5">
        <div className="space-y-2 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white">Compte utilisateur</p>
          <p className="text-sm text-stone-400">Ce formulaire cree ou met a jour le user sans mot de passe, puis rattache son profil a l&apos;agence.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => <Input label="Prenom" placeholder="Aina" {...field} />}
          />

          <Controller
            name="lastName"
            control={control}
            render={({ field }) => <Input label="Nom" placeholder="Rakoto" {...field} />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input label="Email" placeholder="agent@agence.com" type="email" {...field} />}
          />

          <Controller
            name="phone"
            control={control}
            render={({ field }) => <Input label="Telephone" placeholder="+261 34 00 000 00" {...field} />}
          />
        </div>

        <div className="space-y-2 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white">Agency member</p>
          <p className="text-sm text-stone-400">Role, statut et rattachement agence de l&apos;utilisateur.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="roleOption"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label="Role membre"
                options={MEMBER_ROLE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            name="statusOption"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label="Statut membre"
                options={MEMBER_STATUS_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="permissionOption"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label="Role personnalise"
                options={roleTemplateOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            name="jobTitle"
            control={control}
            render={({ field }) => <Input label="Poste" placeholder="Commercial terrain" {...field} />}
          />
        </div>
      </div>
    </ModalLayout>
  );
};

export default ModalManageMember;
