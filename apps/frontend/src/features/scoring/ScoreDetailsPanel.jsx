import { Card } from "../../components/ui/Card.jsx";
import { ScoreBadge } from "../../components/ui/ScoreBadge.jsx";

export const PROPERTY_SCORE_CRITERIA = [
  { key: "priceScore", label: "Prix vs marche", weight: "35%" },
  { key: "locationScore", label: "Localisation", weight: "25%" },
  { key: "photoScore", label: "Photos", weight: "20%" },
  { key: "historyScore", label: "Historique", weight: "20%" }
];

export const AGENT_SCORE_CRITERIA = [
  { key: "ratingScore", label: "Notes users", weight: "35%" },
  { key: "propertyScore", label: "Biens geres", weight: "25%" },
  { key: "contractScore", label: "Contrats conclus", weight: "25%" },
  { key: "clientRelationScore", label: "Relation client", weight: "15%" }
];

export const AGENCY_SCORE_CRITERIA = [
  { key: "agentsScore", label: "Score agents", weight: "40%" },
  { key: "managedPropertiesScore", label: "Biens geres", weight: "30%" },
  { key: "closedDealsScore", label: "Biens conclus", weight: "30%" }
];

const scoreColors = (score) => {
  if (score >= 80) return "from-blue-400 to-blue-500";
  if (score >= 60) return "from-emerald-400 to-green-500";
  if (score >= 40) return "from-yellow-300 to-amber-500";
  return "from-red-400 to-rose-500";
};

const normalizeScore = (score) => Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

export const ScoreDetailsPanel = ({
  title = "Score intelligent",
  score = 0,
  details = null,
  criteria = PROPERTY_SCORE_CRITERIA,
  compact = false
}) => {
  const normalizedScore = normalizeScore(score);
  const recommendations = details?.recommendations || [];

  return (
    <Card className={compact ? "space-y-4 rounded-[1.5rem] p-4" : "space-y-5 rounded-[2rem] border-white/10 bg-white/[0.04]"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{title}</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-serif text-4xl text-white">{normalizedScore}</span>
            <span className="pb-1 text-sm text-stone-400">/100</span>
          </div>
        </div>
        <ScoreBadge score={normalizedScore} showScore />
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => {
          const criterionScore = normalizeScore(details?.[criterion.key]);

          return (
            <div key={criterion.key} className="rounded-2xl border border-white/10 bg-stone-950/45 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-stone-200">{criterion.label}</span>
                <span className="text-stone-400">{criterionScore}/100 - {criterion.weight}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${scoreColors(criterionScore)}`}
                  style={{ width: `${criterionScore}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {recommendations.length ? (
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/80">Recommandations</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">
            {recommendations.map((recommendation) => (
              <li key={recommendation} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
};
