import { useEffect, useMemo, useState } from "react";
import { ModalLayout } from "../../components/layout/modals/ModalLayout.jsx";
import { ScoreBadge } from "../../components/ui/ScoreBadge.jsx";
import { Textarea } from "../../components/ui/Textarea.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";

const CRITERIA = [
  { key: "responsiveness", labelKey: "responsiveness", fallback: "Reactivite" },
  { key: "professionalism", labelKey: "professionalism", fallback: "Professionnalisme" },
  { key: "followUpQuality", labelKey: "followUpQuality", fallback: "Qualite du suivi" },
  { key: "clientRelation", labelKey: "clientRelation", fallback: "Relation client" }
];

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const getPersonName = (agent) => [agent?.firstName, agent?.lastName].filter(Boolean).join(" ").trim() || agent?.email || "cet agent";

const CriteriaSlider = ({ label, value, onChange, disabled }) => (
  <label className="block rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
        {clampScore(value)}/100
      </span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={clampScore(value)}
      disabled={disabled}
      onChange={(event) => onChange(clampScore(event.target.value))}
      className="mt-4 w-full accent-blue-500"
    />
  </label>
);

export const ModalRateAgent = ({ open, agent, existingReview = null, isLoading = false, onClose, onSubmit, isSaving = false }) => {
  const { t } = useUserPreferences();
  const [score, setScore] = useState(80);
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState({
    responsiveness: 80,
    professionalism: 80,
    followUpQuality: 80,
    clientRelation: 80
  });

  useEffect(() => {
    if (!open) return;

    setScore(clampScore(existingReview?.score ?? 80));
    setDescription(existingReview?.description || "");
    setCriteria({
      responsiveness: clampScore(existingReview?.criteria?.responsiveness ?? existingReview?.score ?? 80),
      professionalism: clampScore(existingReview?.criteria?.professionalism ?? existingReview?.score ?? 80),
      followUpQuality: clampScore(existingReview?.criteria?.followUpQuality ?? existingReview?.score ?? 80),
      clientRelation: clampScore(existingReview?.criteria?.clientRelation ?? existingReview?.score ?? 80)
    });
  }, [existingReview, open]);

  const normalizedScore = clampScore(score);
  const title = useMemo(() => {
    const prefix = existingReview
      ? t("private", "agentRating.editTitle", "Modifier votre note")
      : t("private", "agentRating.createTitle", "Noter l'agent");
    return `${prefix} - ${getPersonName(agent)}`;
  }, [agent, existingReview, t]);

  const handleCriteriaChange = (key, value) => {
    setCriteria((current) => ({ ...current, [key]: clampScore(value) }));
  };

  return (
    <ModalLayout
      open={open}
      title={title}
      saveLabel={existingReview ? t("private", "agentRating.update", "Mettre a jour") : t("private", "agentRating.submit", "Envoyer la note")}
      cancelLabel={t("private", "agentRating.close", "Fermer")}
      onClose={onClose}
      onSave={() => onSubmit?.({ score: normalizedScore, description, criteria })}
      saveDisabled={isSaving || isLoading || !agent}
      isSaving={isSaving}
      panelClassName="max-w-3xl"
    >
      <div className="space-y-6">
        <Card className="rounded-[1.5rem] border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),var(--surface)] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "agentRating.global", "Note globale")}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-serif text-5xl text-[var(--foreground)]">{normalizedScore}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{t("private", "agentRating.help", "Note sur 100, modifiable par chaque utilisateur.")}</p>
            </div>
            <ScoreBadge score={normalizedScore} showScore />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={normalizedScore}
            disabled={isLoading || isSaving}
            onChange={(event) => setScore(clampScore(event.target.value))}
            className="mt-5 w-full accent-blue-500"
          />
        </Card>

        {isLoading ? (
          <Card className="border-[var(--border)] bg-[var(--surface-soft)]">
            <p className="text-sm text-[var(--muted)]">{t("private", "agentRating.loading", "Chargement de votre note existante...")}</p>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {CRITERIA.map((item) => (
            <CriteriaSlider
              key={item.key}
              label={t("private", `agentRating.criteria.${item.labelKey}`, item.fallback)}
              value={criteria[item.key]}
              disabled={isLoading || isSaving}
              onChange={(value) => handleCriteriaChange(item.key, value)}
            />
          ))}
        </div>

        <Textarea
          label={t("private", "agentRating.comment", "Commentaire optionnel")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("private", "agentRating.placeholder", "Expliquez votre experience: reactivite, conseil, suivi, clarte des informations...")}
          rows={5}
          disabled={isLoading || isSaving}
        />
      </div>
    </ModalLayout>
  );
};

export default ModalRateAgent;
