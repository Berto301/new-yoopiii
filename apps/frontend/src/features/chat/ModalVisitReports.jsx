import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BaseListBox } from "../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../components/layout/modals/ModalLayout.jsx";
import { FileUploadField } from "../../components/ui/FileUploadField.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { RadioGroup } from "../../components/ui/RadioGroup.jsx";
import { Switch } from "../../components/ui/Switch.jsx";
import { Textarea } from "../../components/ui/Textarea.jsx";
import {
  clientTypeOptions,
  followUpActionOptions,
  getVisitReportDefaultValues,
  locationAppreciationOptions,
  normalizeTags,
  operationTypeOptions,
  perceptionPriceOptions,
  pipelineStatusOptions,
  visitInterestOptions,
  visitReportSchema
} from "./report.utils.js";

const Section = ({ eyebrow, title, children }) => (
  <section className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/70">{eyebrow}</p>
      <h4 className="mt-2 text-lg font-semibold text-white">{title}</h4>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

export const ModalVisitReports = ({
  open,
  mode = "create",
  currentUser,
  participant,
  propertyOptions = [],
  report = null,
  isSaving = false,
  isUploading = false,
  onUploadFiles,
  onClose,
  onSubmit
}) => {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(visitReportSchema),
    defaultValues: getVisitReportDefaultValues({
      user: currentUser,
      participant,
      propertyOption: propertyOptions[0],
      report
    })
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(getVisitReportDefaultValues({
      user: currentUser,
      participant,
      propertyOption: propertyOptions[0],
      report
    }));
  }, [currentUser, open, participant, propertyOptions, report, reset]);

  const values = watch();

  return (
    <ModalLayout
      open={open}
      title={mode === "edit" ? "Rapport de visite" : "Nouveau rapport de visite"}
      saveLabel={mode === "edit" ? "Mettre a jour" : "Enregistrer"}
      onClose={onClose}
      onSave={handleSubmit((formValues) => onSubmit({
        ...formValues,
        tags: normalizeTags(formValues.tags)
      }))}
      isSaving={isSaving}
      panelClassName="max-w-5xl"
    >
      <div className="space-y-5">
        <Section eyebrow="Section 1" title="Informations generales">
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller
              name="propertyId"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Bien concerne"
                  options={propertyOptions}
                  value={propertyOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => {
                    field.onChange(option?.value || "");
                    setValue("propertyTitle", option?.label || "", { shouldValidate: true });
                    setValue("operationType", option?.purpose || values.operationType, { shouldValidate: true });
                  }}
                  placeholder="Selectionner un bien"
                  error={errors.propertyTitle?.message || errors.propertyId?.message}
                />
              )}
            />

            <Controller
              name="propertyTitle"
              control={control}
              render={({ field }) => (
                <Input {...field} label="Intitule du bien" error={errors.propertyTitle?.message} />
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Controller
              name="visitDate"
              control={control}
              render={({ field }) => <Input {...field} label="Date de visite" type="date" error={errors.visitDate?.message} />}
            />
            <Controller
              name="visitTime"
              control={control}
              render={({ field }) => <Input {...field} label="Heure de visite" type="time" error={errors.visitTime?.message} />}
            />
            <Controller
              name="agentResponsibleName"
              control={control}
              render={({ field }) => <Input {...field} label="Agent responsable" disabled error={errors.agentResponsibleName?.message} />}
            />
          </div>

          <Controller
            name="operationType"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label="Type d'operation"
                options={operationTypeOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.operationType?.message}
              />
            )}
          />
        </Section>

        <Section eyebrow="Section 2" title="Informations client">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller name="clientFullName" control={control} render={({ field }) => <Input {...field} label="Nom complet" error={errors.clientFullName?.message} />} />
            <Controller name="clientPhone" control={control} render={({ field }) => <Input {...field} label="Telephone" error={errors.clientPhone?.message} />} />
            <Controller name="clientEmail" control={control} render={({ field }) => <Input {...field} label="Email" error={errors.clientEmail?.message} />} />
            <Controller
              name="clientType"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Type de client"
                  options={clientTypeOptions}
                  value={clientTypeOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.clientType?.message}
                />
              )}
            />
          </div>
        </Section>

        <Section eyebrow="Section 3" title="Details de la visite">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="interestStatus"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Statut d'interet"
                  options={visitInterestOptions}
                  value={visitInterestOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.interestStatus?.message}
                />
              )}
            />
            <Controller name="estimatedBudget" control={control} render={({ field }) => <Input {...field} label="Budget estime" type="number" min="0" error={errors.estimatedBudget?.message} />} />
            <Controller name="attendees" control={control} render={({ field }) => <Input {...field} label="Personnes presentes" error={errors.attendees?.message} />} />
            <Controller name="durationMinutes" control={control} render={({ field }) => <Input {...field} label="Duree (minutes)" type="number" min="1" error={errors.durationMinutes?.message} />} />
          </div>
          <Controller name="clientNeed" control={control} render={({ field }) => <Textarea {...field} label="Besoin du client" error={errors.clientNeed?.message} />} />
        </Section>

        <Section eyebrow="Section 4" title="Feedback client">
          <div className="grid gap-4 lg:grid-cols-2">
            <Controller name="positivePoints" control={control} render={({ field }) => <Textarea {...field} label="Points positifs" error={errors.positivePoints?.message} />} />
            <Controller name="negativePoints" control={control} render={({ field }) => <Textarea {...field} label="Points negatifs" error={errors.negativePoints?.message} />} />
          </div>
          <Controller name="objections" control={control} render={({ field }) => <Textarea {...field} label="Objections" error={errors.objections?.message} />} />
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="pricePerception"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Perception du prix"
                  options={perceptionPriceOptions}
                  value={perceptionPriceOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.pricePerception?.message}
                />
              )}
            />
            <Controller
              name="locationAppreciation"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Appreciation de la localisation"
                  options={locationAppreciationOptions}
                  value={locationAppreciationOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.locationAppreciation?.message}
                />
              )}
            />
          </div>
        </Section>

        <Section eyebrow="Section 5" title="Suite a donner">
          <Controller
            name="followUpPlanned"
            control={control}
            render={({ field }) => (
              <Switch
                label="Relance prevue"
                description="Activez si une relance commerciale doit etre planifiee."
                checked={Boolean(field.value)}
                onChange={field.onChange}
                error={errors.followUpPlanned?.message}
              />
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Controller name="followUpDate" control={control} render={({ field }) => <Input {...field} label="Date de relance" type="date" disabled={!values.followUpPlanned} error={errors.followUpDate?.message} />} />
            <Controller
              name="nextAction"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Prochaine action"
                  options={followUpActionOptions}
                  value={followUpActionOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.nextAction?.message}
                />
              )}
            />
            <Controller name="conversionProbability" control={control} render={({ field }) => <Input {...field} label="Probabilite de conversion (%)" type="number" min="0" max="100" error={errors.conversionProbability?.message} />} />
            <Controller
              name="pipelineStatus"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Statut pipeline"
                  options={pipelineStatusOptions}
                  value={pipelineStatusOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.pipelineStatus?.message}
                />
              )}
            />
          </div>
        </Section>

        <Section eyebrow="Section 6" title="Notes internes">
          <Controller name="agentComment" control={control} render={({ field }) => <Textarea {...field} label="Commentaire agent" error={errors.agentComment?.message} />} />
          <Controller name="recommendations" control={control} render={({ field }) => <Textarea {...field} label="Recommandations" error={errors.recommendations?.message} />} />
          <Controller name="tags" control={control} render={({ field }) => <Input {...field} label="Tags" placeholder="visite chaude, budget valide, centre-ville" error={errors.tags?.message} />} />
        </Section>

        <Section eyebrow="Section 7" title="Pieces jointes">
          <Controller
            name="attachments"
            control={control}
            render={({ field }) => (
              <FileUploadField
                label="Documents et medias"
                description="Ajoutez un ou plusieurs fichiers associes a la visite."
                files={field.value || []}
                multiple
                isUploading={isUploading}
                onSelectFiles={async (files) => {
                  const uploadedFiles = await onUploadFiles?.(files);
                  if (uploadedFiles?.length) {
                    field.onChange([...(field.value || []), ...uploadedFiles.map((item) => item.publicPath)]);
                  }
                }}
                onRemove={(index) => field.onChange((field.value || []).filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          />
        </Section>
      </div>
    </ModalLayout>
  );
};

export default ModalVisitReports;
