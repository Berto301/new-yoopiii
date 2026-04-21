import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { BaseListBox } from "../../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../../components/layout/modals/ModalLayout.jsx";
import { Input } from "../../../components/ui/Input.jsx";
import { getUserById } from "../../../features/owner/services/owner.service.js";

const genderOptions = [
  { label: "Homme", value: "homme" },
  { label: "Femme", value: "femme" },
  { label: "Autre", value: "autre" }
];

const buildDefaultValues = ({ tenant, propertyOptions }) => {
  const fallbackProperty = propertyOptions.find((property) => property.value === tenant?.managedPropertyId) || null;

  return {
    linkedUserId: tenant?.linkedUserId || "",
    managedPropertyId: tenant?.managedPropertyId || fallbackProperty?.value || "",
    firstName: tenant?.firstName || "",
    lastName: tenant?.lastName || "",
    email: tenant?.email || "",
    phone: tenant?.phone || "",
    cin: tenant?.cin || "",
    adresse: tenant?.adresse || "",
    sexe: tenant?.sexe || ""
  };
};

const normalizePayload = (values, selectedPropertyOption) => ({
  linkedUserId: values.linkedUserId || null,
  managedPropertyId: values.managedPropertyId,
  managementContractId: selectedPropertyOption?.managementContractId || null,
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: values.email.trim(),
  phone: values.phone.trim(),
  cin: values.cin.trim(),
  adresse: values.adresse.trim(),
  sexe: values.sexe,
  documentsCount: 0,
  paymentHistoryLabel: ""
});

export const ModalManageLocataire = ({
  open,
  mode,
  tenant,
  propertyOptions = [],
  userOptions = [],
  onClose,
  onSubmit,
  isSaving = false
}) => {
  const defaultValues = useMemo(() => buildDefaultValues({ tenant, propertyOptions }), [propertyOptions, tenant]);
  const lastHydratedUserIdRef = useRef(null);
  const title = mode === "edit" ? "Modifier le locataire" : "Nouveau locataire";

  const {
    control,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors }
  } = useForm({ defaultValues });

  const linkedUserId = watch("linkedUserId");
  const managedPropertyId = watch("managedPropertyId");

  const selectedPropertyOption = useMemo(
    () => propertyOptions.find((property) => property.value === managedPropertyId) || null,
    [managedPropertyId, propertyOptions]
  );

  const selectedUserQuery = useQuery({
    queryKey: ["owner-tenant-user", linkedUserId],
    queryFn: () => getUserById(linkedUserId),
    enabled: open && Boolean(linkedUserId)
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      lastHydratedUserIdRef.current = defaultValues.linkedUserId || null;
    }
  }, [defaultValues, open, reset]);

  useEffect(() => {
    if (!linkedUserId) {
      lastHydratedUserIdRef.current = null;
      return;
    }

    if (!selectedUserQuery.data || lastHydratedUserIdRef.current === linkedUserId) {
      return;
    }

    const user = selectedUserQuery.data;
    setValue("firstName", user.firstName || "", { shouldDirty: true, shouldValidate: true });
    setValue("lastName", user.lastName || "", { shouldDirty: true, shouldValidate: true });
    setValue("email", user.email || "", { shouldDirty: true, shouldValidate: true });
    setValue("phone", user.phone || "", { shouldDirty: true, shouldValidate: false });
    setValue("cin", user.cin || "", { shouldDirty: true, shouldValidate: false });
    setValue("adresse", user.adresse || "", { shouldDirty: true, shouldValidate: false });
    setValue("sexe", user.sexe || "", { shouldDirty: true, shouldValidate: true });
    lastHydratedUserIdRef.current = linkedUserId;
  }, [linkedUserId, selectedUserQuery.data, setValue]);

  return (
    <ModalLayout
      open={open}
      title={title}
      onClose={onClose}
      onSave={handleSubmit(async (values) => {
        await onSubmit(normalizePayload(values, selectedPropertyOption));
      })}
      saveLabel={mode === "edit" ? "Mettre a jour" : "Creer le locataire"}
      isSaving={isSaving}
      panelClassName="max-w-4xl"
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <section className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Locataire centralise</p>
            <h3 className="text-xl font-semibold text-white">Fiche locataire reliee a un bien loue</h3>
            <p className="text-sm leading-6 text-stone-300">
              Selectionnez un utilisateur existant pour pre-remplir la fiche, puis verifiez les informations locataire avant enregistrement.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Controller
              name="linkedUserId"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Utilisateur source"
                  options={userOptions}
                  value={userOptions.find((option) => option.value === field.value) || null}
                  onChange={(nextValue) => field.onChange(nextValue?.value || "")}
                  placeholder={userOptions.length ? "Selectionner un utilisateur" : "Aucun utilisateur disponible"}
                />
              )}
            />
            <Controller
              name="managedPropertyId"
              control={control}
              rules={{ required: "Le bien en location est requis." }}
              render={({ field }) => (
                <BaseListBox
                  label="Bien loue"
                  options={propertyOptions}
                  value={propertyOptions.find((option) => option.value === field.value) || null}
                  onChange={(nextValue) => field.onChange(nextValue?.value || "")}
                  error={errors.managedPropertyId?.message}
                  placeholder="Selectionner le bien"
                />
              )}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Contrat associe"
              value={selectedPropertyOption?.contractLabel || "Aucun contrat associe"}
              readOnly
              className="cursor-default bg-stone-950/90 text-stone-200"
            />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-black/15 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="lastName"
              control={control}
              rules={{ required: "Le nom est requis." }}
              render={({ field }) => <Input label="Nom" error={errors.lastName?.message} {...field} />}
            />
            <Controller
              name="firstName"
              control={control}
              rules={{ required: "Le prenom est requis." }}
              render={({ field }) => <Input label="Prenom" error={errors.firstName?.message} {...field} />}
            />
            <Controller
              name="email"
              control={control}
              rules={{ required: "L'email est requis." }}
              render={({ field }) => <Input label="Email" type="email" error={errors.email?.message} {...field} />}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => <Input label="Telephone" error={errors.phone?.message} {...field} />}
            />
            <Controller
              name="cin"
              control={control}
              render={({ field }) => <Input label="CIN" error={errors.cin?.message} {...field} />}
            />
            <Controller
              name="sexe"
              control={control}
              rules={{ required: "Le sexe est requis." }}
              render={({ field }) => (
                <BaseListBox
                  label="Type"
                  options={genderOptions}
                  value={genderOptions.find((option) => option.value === field.value) || null}
                  onChange={(nextValue) => field.onChange(nextValue?.value || "")}
                  error={errors.sexe?.message}
                  placeholder="Selectionner"
                />
              )}
            />
            <div className="md:col-span-2">
              <Controller
                name="adresse"
                control={control}
                render={({ field }) => <Input label="Adresse" error={errors.adresse?.message} {...field} />}
              />
            </div>
          </div>
        </section>
      </form>
    </ModalLayout>
  );
};
