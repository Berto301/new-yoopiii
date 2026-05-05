import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { ScoreBadge } from "../../components/ui/ScoreBadge.jsx";
import { useUserPreferences } from "../../app/preferences/UserPreferencesProvider.jsx";
import { useNotification } from "../../hooks/useNotification.js";
import { resolveAssetUrl } from "../../lib/utils/asset-url.js";
import { getCrmMetadata, updateCrmPipelineStage } from "../../features/crm/services/crm.service.js";
import { SettingsTabButton } from "../private/settings/SettingsTabButton.jsx";

const STAGE_TONES = {
  new: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  qualified: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  visited: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  proposal_sent: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  negotiation: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  won: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  lost: "border-red-500/30 bg-red-500/10 text-red-200"
};

const PRIORITY_LABELS = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute"
};

const DATA_USED_KEYS = {
  Prix: "price",
  Localisation: "location",
  Photos: "photos",
  Historique: "history",
  "Score intelligent": "smartScore",
  "Visite 3D": "threeD",
  Favoris: "favorites",
  Vues: "views"
};

const formatDate = (value, locale = "fr-FR") => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

const getStageLabel = (t, stage, fallback) => t("private", `crm.stages.${stage}`, fallback || stage);
const getPriorityLabel = (t, priority) => t("private", `crm.priorities.${priority}`, PRIORITY_LABELS[priority] || priority);
const getDataUsedLabel = (t, data) => {
  const key = DATA_USED_KEYS[data];
  return key ? t("private", `crm.dataUsed.${key}`, data) : data;
};

const MetadataCard = ({ item, onGoPipeline, t, locale }) => (
  <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] p-0">
    <div className="grid gap-0 xl:grid-cols-[280px_1fr]">
      <div className="relative min-h-[220px] bg-[var(--surface-soft)]">
        {item.property.coverImage ? (
          <img src={resolveAssetUrl(item.property.coverImage)} alt={item.property.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(157,93,67,0.22),transparent_36%),var(--surface-soft)]" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <ScoreBadge score={item.property.score || 0} showScore />
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{t("private", "crm.labels.property", "Bien concerne")}</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{item.property.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.property.address || t("private", "crm.labels.addressMissing", "Adresse non renseignee")}</p>
          </div>
          <Badge className={STAGE_TONES[item.pipelineStage] || "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]"}>{getStageLabel(t, item.pipelineStage, item.pipelineLabel)}</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "crm.labels.agent", "Agent responsable")}</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar src={item.agent.avatar} name={item.agent.fullName} alt={`Photo de ${item.agent.fullName}`} size="sm" type="agent" />
              <p className="min-w-0 break-words text-sm font-semibold text-[var(--foreground)]">{item.agent.fullName}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "crm.labels.priority", "Priorite")}</p>
            <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{getPriorityLabel(t, item.priority)}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "crm.labels.updatedAt", "Mise a jour")}</p>
            <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{formatDate(item.updatedAt, locale)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "crm.labels.dataUsed", "Donnees utilisees")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.dataUsed.map((data) => (
              <span key={`${item.id}-${data}`} className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--foreground)]">
                {getDataUsedLabel(t, data)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" onClick={onGoPipeline}>{t("private", "crm.actions.goPipeline", "Aller dans Pipeline")}</Button>
        </div>
      </div>
    </div>
  </Card>
);

const PipelineCard = ({ item, onDragStart, t }) => (
  <article
    draggable
    onDragStart={() => onDragStart(item.id)}
    className="cursor-grab rounded-[1.4rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.12)] active:cursor-grabbing"
  >
    {item.property.coverImage ? (
      <img src={resolveAssetUrl(item.property.coverImage)} alt={item.property.title} className="h-28 w-full rounded-[1rem] object-cover" />
    ) : null}
    <div className="mt-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">{item.property.title}</h4>
        <ScoreBadge score={item.property.score || 0} />
      </div>
      <div className="flex items-center gap-2">
        <Avatar src={item.agent.avatar} name={item.agent.fullName} alt={item.agent.fullName} size="xs" type="agent" />
        <p className="truncate text-xs text-[var(--muted)]">{item.agent.fullName}</p>
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">{item.nextAction || t("private", "crm.labels.nextActionMissing", "Prochaine action a definir")}</p>
    </div>
  </article>
);

export const CrmMetadataPage = () => {
  const { t, locale } = useUserPreferences();
  const { showError, showSuccess } = useNotification();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [draggedId, setDraggedId] = useState("");
  const crmQuery = useQuery({
    queryKey: ["crm-metadata", search, stageFilter],
    queryFn: () => getCrmMetadata({ search, stage: stageFilter })
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ metadataId, pipelineStage }) => updateCrmPipelineStage({ metadataId, payload: { pipelineStage } }),
    onMutate: async ({ metadataId, pipelineStage }) => {
      await queryClient.cancelQueries({ queryKey: ["crm-metadata"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["crm-metadata"] });

      snapshots.forEach(([queryKey, data]) => {
        if (!data?.items) return;
        queryClient.setQueryData(queryKey, {
          ...data,
          items: data.items.map((item) => item.id === metadataId ? { ...item, pipelineStage, pipelineLabel: data.stages?.find((stage) => stage.value === pipelineStage)?.label || pipelineStage } : item)
        });
      });

      return { snapshots };
    },
    onError: (error, _variables, context) => {
      (context?.snapshots || []).forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data));
      showError(error?.response?.data?.message || error?.message || t("private", "crm.errors.update", "Impossible de mettre a jour l'etape CRM."));
    },
    onSuccess: () => {
      showSuccess(t("private", "crm.success.pipeline", "Etape pipeline mise a jour."));
      queryClient.invalidateQueries({ queryKey: ["crm-metadata"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const items = crmQuery.data?.items || [];
  const stages = crmQuery.data?.stages || [];
  const summary = crmQuery.data?.summary || {};
  const groupedItems = useMemo(() => {
    const groups = Object.fromEntries(stages.map((stage) => [stage.value, []]));
    items.forEach((item) => {
      if (!groups[item.pipelineStage]) groups[item.pipelineStage] = [];
      groups[item.pipelineStage].push(item);
    });
    return groups;
  }, [items, stages]);

  const handleDrop = (pipelineStage) => {
    if (!draggedId) return;
    const draggedItem = items.find((item) => item.id === draggedId);
    setDraggedId("");

    if (!draggedItem || draggedItem.pipelineStage === pipelineStage) {
      return;
    }

    updateStageMutation.mutate({ metadataId: draggedId, pipelineStage });
  };

  return (
    <section className="space-y-8">
      <Card className="overflow-hidden border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(157,93,67,0.14),transparent_28%),var(--surface)] p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <SectionTitle
            eyebrow={t("private", "crm.eyebrow", "Metadonnees CRM")}
            title={t("private", "crm.title", "Pipeline et donnees commerciales des biens")}
            description={t("private", "crm.description", "Centralisez les metadonnees liees aux biens, agents et etapes commerciales, puis faites evoluer le pipeline par drag and drop.")}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "crm.summary.total", "Total")}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{summary.total || 0}</p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "crm.summary.negotiation", "Negociation")}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{summary.negotiation || 0}</p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{t("private", "crm.summary.won", "Gagne")}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{summary.won || 0}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-3" aria-label="CRM tabs">
          <SettingsTabButton active={activeTab === "list"} label={t("private", "crm.tabs.list", "Liste")} onClick={() => setActiveTab("list")} />
          <SettingsTabButton active={activeTab === "pipeline"} label={t("private", "crm.tabs.pipeline", "Pipeline")} onClick={() => setActiveTab("pipeline")} />
        </nav>
        <div className="grid gap-3 sm:grid-cols-[260px_220px]">
          <Input label={t("private", "crm.filters.search", "Recherche")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("private", "crm.filters.searchPlaceholder", "Bien, agent, donnee...")} />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">{t("private", "crm.filters.stage", "Etape")}</span>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-brand-500">
              <option value="all">{t("private", "crm.filters.allStages", "Toutes")}</option>
              {stages.map((stage) => <option key={stage.value} value={stage.value}>{getStageLabel(t, stage.value, stage.label)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {crmQuery.isLoading ? (
        <Card><p className="text-sm text-[var(--muted)]">{t("private", "crm.loading", "Chargement des metadonnees CRM...")}</p></Card>
      ) : crmQuery.isError ? (
        <Card className="border-red-500/25 bg-red-500/10"><p className="text-sm text-red-200">{t("private", "crm.error", "Impossible de charger les metadonnees CRM.")}</p></Card>
      ) : activeTab === "list" ? (
        <div className="space-y-4">
          {items.map((item) => <MetadataCard key={item.id} item={item} t={t} locale={locale} onGoPipeline={() => setActiveTab("pipeline")} />)}
          {!items.length ? <Card><p className="text-sm text-[var(--muted)]">{t("private", "crm.empty", "Aucune metadonnee CRM disponible pour ces filtres.")}</p></Card> : null}
        </div>
      ) : (
        <div className="overflow-x-auto pb-3">
          <div className="grid min-w-[1180px] grid-cols-7 gap-4">
            {stages.map((stage) => (
              <section
                key={stage.value}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(stage.value)}
                className="min-h-[540px] rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-soft)] p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge className={STAGE_TONES[stage.value] || "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]"}>{getStageLabel(t, stage.value, stage.label)}</Badge>
                  <span className="text-xs text-[var(--muted)]">{groupedItems[stage.value]?.length || 0}</span>
                </div>
                <div className="space-y-3">
                  {(groupedItems[stage.value] || []).map((item) => (
                    <PipelineCard key={item.id} item={item} t={t} onDragStart={setDraggedId} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default CrmMetadataPage;
