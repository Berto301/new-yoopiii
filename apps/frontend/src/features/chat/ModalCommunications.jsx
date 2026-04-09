import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BaseListBox } from "../../components/form/BaseListBox.jsx";
import { ModalLayout } from "../../components/layout/modals/ModalLayout.jsx";
import { FileUploadField } from "../../components/ui/FileUploadField.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { RadioGroup } from "../../components/ui/RadioGroup.jsx";
import { Textarea } from "../../components/ui/Textarea.jsx";
import {
  channelOptions,
  communicationReportSchema,
  communicationResultOptions,
  communicationToneOptions,
  directionOptions,
  followUpActionOptions,
  getCommunicationReportDefaultValues,
  interestLevelOptions,
  leadSourceOptions,
  normalizeTags,
  pipelineStatusOptions,
  priorityOptions,
  visibilityOptions
} from "./report.utils.js";

const Section = ({ eyebrow, title, children }) => (
  <section className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">{eyebrow}</p>
      <h4 className="mt-2 text-lg font-semibold text-white">{title}</h4>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

export const ModalCommunications = ({
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
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(communicationReportSchema),
    defaultValues: getCommunicationReportDefaultValues({
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

    reset(getCommunicationReportDefaultValues({
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
      title={mode === "edit" ? "Rapport de communication" : "Nouveau rapport de communication"}
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
        <Section eyebrow="Section 1" title="Contexte">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller name="clientFullName" control={control} render={({ field }) => <Input {...field} label="Client concerne" error={errors.clientFullName?.message} />} />
            <Controller name="agentResponsibleName" control={control} render={({ field }) => <Input {...field} label="Agent responsable" disabled error={errors.agentResponsibleName?.message} />} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="propertyId"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Bien lie (optionnel)"
                  options={propertyOptions}
                  value={propertyOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => {
                    field.onChange(option?.value || "");
                    setValue("propertyTitle", option?.label || "", { shouldValidate: true });
                  }}
                  placeholder="Aucun bien specifique"
                  error={errors.propertyId?.message}
                />
              )}
            />
            <Controller name="propertyTitle" control={control} render={({ field }) => <Input {...field} label="Intitule du bien" error={errors.propertyTitle?.message} />} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Controller name="communicationDate" control={control} render={({ field }) => <Input {...field} label="Date" type="date" error={errors.communicationDate?.message} />} />
            <Controller name="communicationTime" control={control} render={({ field }) => <Input {...field} label="Heure" type="time" error={errors.communicationTime?.message} />} />
            <Controller
              name="channel"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Canal"
                  options={channelOptions}
                  value={channelOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.channel?.message}
                />
              )}
            />
            <Controller name="durationMinutes" control={control} render={({ field }) => <Input {...field} label="Duree (min)" type="number" min="0" error={errors.durationMinutes?.message} />} />
          </div>
        </Section>

        <Section eyebrow="Section 2" title="Details de l'echange">
          <Controller
            name="direction"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label="Direction"
                options={directionOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.direction?.message}
              />
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Controller name="subject" control={control} render={({ field }) => <Input {...field} label="Objet" error={errors.subject?.message} />} />
            <Controller
              name="clientTone"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Ton du client"
                  options={communicationToneOptions}
                  value={communicationToneOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.clientTone?.message}
                />
              )}
            />
          </div>

          <Controller name="summary" control={control} render={({ field }) => <Textarea {...field} label="Resume" rows={3} error={errors.summary?.message} />} />
          <Controller name="detailedContent" control={control} render={({ field }) => <Textarea {...field} label="Contenu detaille" rows={5} error={errors.detailedContent?.message} />} />

          <Controller
            name="interestLevel"
            control={control}
            render={({ field }) => (
              <BaseListBox
                label="Niveau d'interet"
                options={interestLevelOptions}
                value={interestLevelOptions.find((option) => option.value === field.value) || null}
                onChange={(option) => field.onChange(option?.value || "")}
                error={errors.interestLevel?.message}
              />
            )}
          />
        </Section>

        <Section eyebrow="Section 3" title="Resultat">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="interactionResult"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Resultat de l'interaction"
                  options={communicationResultOptions}
                  value={communicationResultOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.interactionResult?.message}
                />
              )}
            />
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
            <Controller name="nextActionDate" control={control} render={({ field }) => <Input {...field} label="Date prochaine action" type="date" error={errors.nextActionDate?.message} />} />
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Priorite"
                  options={priorityOptions}
                  value={priorityOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.priority?.message}
                />
              )}
            />
          </div>
        </Section>

        <Section eyebrow="Section 4" title="Tracabilite">
          <Controller
            name="attachments"
            control={control}
            render={({ field }) => (
              <FileUploadField
                label="Pieces jointes"
                description="Documents, captures d'ecran ou preuves d'echange."
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

          <div className="grid gap-4 md:grid-cols-2">
            <Controller name="externalLink" control={control} render={({ field }) => <Input {...field} label="Lien externe" placeholder="https://..." error={errors.externalLink?.message} />} />
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  label="Visibilite"
                  options={visibilityOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.visibility?.message}
                />
              )}
            />
          </div>

          <Controller name="tags" control={control} render={({ field }) => <Input {...field} label="Tags" placeholder="appel, prioritaire, negociable" error={errors.tags?.message} />} />
          <Controller name="internalNote" control={control} render={({ field }) => <Textarea {...field} label="Note interne" error={errors.internalNote?.message} />} />
        </Section>

        <Section eyebrow="Section 5" title="Metadonnees CRM">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="leadSource"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Source du lead"
                  options={leadSourceOptions}
                  value={leadSourceOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.leadSource?.message}
                />
              )}
            />
            <Controller
              name="pipelineStage"
              control={control}
              render={({ field }) => (
                <BaseListBox
                  label="Etape pipeline"
                  options={pipelineStatusOptions}
                  value={pipelineStatusOptions.find((option) => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option?.value || "")}
                  error={errors.pipelineStage?.message}
                />
              )}
            />
            <Controller name="leadScore" control={control} render={({ field }) => <Input {...field} label="Score du lead" type="number" min="0" max="100" error={errors.leadScore?.message} />} />
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Apercu</p>
              <p className="mt-2 text-sm text-stone-200">
                Priorite {values.priority} | interet {values.interestLevel} | score {values.leadScore}/100
              </p>
            </div>
          </div>

          <Controller name="lossReason" control={control} render={({ field }) => <Textarea {...field} label="Raison de perte si perdu" rows={3} error={errors.lossReason?.message} />} />
        </Section>
      </div>
    </ModalLayout>
  );
};

export default ModalCommunications;
