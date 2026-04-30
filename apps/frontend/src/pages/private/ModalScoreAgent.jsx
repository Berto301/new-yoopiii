import { useEffect, useState } from "react";
import { ModalLayout } from "../../components/layout/modals/ModalLayout.jsx";
import { ScoreBadge } from "../../components/ui/ScoreBadge.jsx";
import { Textarea } from "../../components/ui/Textarea.jsx";

const getPersonName = (agent) => [agent?.firstName, agent?.lastName].filter(Boolean).join(" ").trim() || agent?.email || "cet agent";

export const ModalScoreAgent = ({ open, agent, onClose, onSubmit, isSaving = false }) => {
  const [score, setScore] = useState(80);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setScore(80);
    setDescription("");
  }, [open, agent?.userId]);

  const normalizedScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

  return (
    <ModalLayout
      open={open}
      title={`Noter ${getPersonName(agent)}`}
      saveLabel="Envoyer la note"
      cancelLabel="Fermer"
      onClose={onClose}
      onSave={() => onSubmit?.({ score: normalizedScore, description })}
      saveDisabled={isSaving || !agent}
      isSaving={isSaving}
      panelClassName="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),rgba(255,255,255,0.04)] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Score utilisateur</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-serif text-5xl text-white">{normalizedScore}</p>
              <p className="mt-1 text-sm text-stone-400">Note sur 100, simple et lisible.</p>
            </div>
            <ScoreBadge score={normalizedScore} showScore />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={normalizedScore}
            onChange={(event) => setScore(event.target.value)}
            className="mt-5 w-full accent-blue-400"
          />
        </div>

        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Expliquez votre experience: reactivite, conseil, suivi, clarte des informations..."
          rows={5}
        />
      </div>
    </ModalLayout>
  );
};

export default ModalScoreAgent;
