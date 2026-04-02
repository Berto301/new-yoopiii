import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { BaseListBox } from "../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../components/layout/modals/ModalLayout.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { getAppointmentFormValues } from "./appointment.utils.js";

const textAreaClassName = "min-h-28 w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60";

export const ModalManageAppointment = ({
  open,
  mode = "create",
  readOnly = false,
  appointment = null,
  propertyOptions = [],
  currentUser = null,
  agent = null,
  client = null,
  isAgent = false,
  isSaving = false,
  onClose,
  onSubmit
}) => {
  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: getAppointmentFormValues(appointment)
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(getAppointmentFormValues(appointment));
  }, [appointment, open, reset]);

  const values = watch();
  const canEditAgentFields = !readOnly && isAgent;
  const canEditClientFields = !readOnly && !isAgent && mode === "edit";
  const title = readOnly ? "Details du rendez-vous" : "Prise de rendez-vous";
  const saveLabel = mode === "edit" ? "Enregistrer" : "Creer";
  const isSlotInvalid = values.startTime && values.endTime && values.startTime >= values.endTime;
  const hasSelectedProperty = Boolean(values.propertyOption?.value);

  const submitForm = (formValues) => {
    if (isSlotInvalid) {
      return;
    }

    onSubmit(formValues);
  };

  return (
    <ModalLayout
      open={open}
      title={title}
      saveLabel={saveLabel}
      cancelLabel="Annuler"
      onClose={onClose}
      onSave={handleSubmit(submitForm)}
      isSaving={isSaving}
      saveDisabled={readOnly || !hasSelectedProperty || !values.date || !values.startTime || !values.endTime || isSlotInvalid}
    >
      <div className="space-y-5">
        <Controller
          name="propertyOption"
          control={control}
          render={({ field }) => (
            <BaseListBox
              label="Bien concerne"
              options={propertyOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder="Veuillez selectionnez le bien a prendre rendez vous"
              disabled={!canEditAgentFields}
            />
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Date"
                type="date"
                disabled={!canEditAgentFields}
              />
            )}
          />

          <Controller
            name="visitFee"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Frais de visite"
                type="number"
                min="0"
                step="1000"
                disabled={!canEditAgentFields}
              />
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Heure de debut"
                type="time"
                step="1800"
                disabled={!canEditAgentFields}
              />
            )}
          />

          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Heure de fin"
                type="time"
                step="1800"
                disabled={!canEditAgentFields}
              />
            )}
          />
        </div>

        {isSlotInvalid ? <p className="text-xs text-red-300">L'heure de fin doit etre superieure a l'heure de debut.</p> : null}

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-200">Description</span>
              <textarea
                {...field}
                className={textAreaClassName}
                placeholder="Precisez le contexte de la visite, le bien concerne, les attentes..."
                disabled={!canEditAgentFields}
                readOnly={!canEditAgentFields}
              />
            </label>
          )}
        />

        <Controller
          name="clientFeedback"
          control={control}
          render={({ field }) => (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-200">Retour client</span>
              <textarea
                {...field}
                className={textAreaClassName}
                placeholder="Le client peut confirmer ses disponibilites ou ajouter des remarques..."
                disabled={!canEditClientFields}
                readOnly={!canEditClientFields}
              />
            </label>
          )}
        />

        <Controller
          name="clientTakesProperty"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-200">
              <input
                type="checkbox"
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
                disabled={!canEditClientFields}
                className="h-4 w-4 rounded border-white/20 bg-stone-900/70"
              />
              <span>Le client prend le bien</span>
            </label>
          )}
        />

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="grid gap-3 text-sm text-stone-300 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agent</p>
              <p className="mt-1 text-white">{[agent?.firstName, agent?.lastName].filter(Boolean).join(" ").trim() || agent?.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Client</p>
              <p className="mt-1 text-white">{[client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Utilisateur courant</p>
              <p className="mt-1 text-white">{[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ").trim() || currentUser?.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Mode</p>
              <p className="mt-1 text-white">{mode === "edit" ? "Modification" : "Creation"}</p>
            </div>
          </div>
        </div>
      </div>
    </ModalLayout>
  );
};

export default ModalManageAppointment;
