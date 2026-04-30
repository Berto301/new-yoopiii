import { cn } from "../../lib/utils/cn.js";

const badgeStyles = {
  excellent:
    "border-blue-200 bg-blue-100 text-blue-700 shadow-blue-950/5 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  bon:
    "border-green-200 bg-green-100 text-green-700 shadow-green-950/5 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300",
  moyen:
    "border-yellow-200 bg-yellow-100 text-yellow-700 shadow-yellow-950/5 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  faible:
    "border-red-200 bg-red-100 text-red-700 shadow-red-950/5 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
};

const badgeLabels = {
  excellent: "Excellent",
  bon: "Bon",
  moyen: "Moyen",
  faible: "Faible"
};

export function getScoreLevel(score) {
  const normalizedScore = Number(score) || 0;
  if (normalizedScore >= 80) return "excellent";
  if (normalizedScore >= 60) return "bon";
  if (normalizedScore >= 40) return "moyen";
  return "faible";
}

export function ScoreBadge({ score, showScore = false, className = "" }) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const level = getScoreLevel(normalizedScore);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105",
        badgeStyles[level],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{badgeLabels[level]}</span>
      {showScore ? <span className="opacity-70">({normalizedScore})</span> : null}
    </span>
  );
}
