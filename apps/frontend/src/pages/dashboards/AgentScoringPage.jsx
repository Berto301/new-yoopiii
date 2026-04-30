import { useQuery } from "@tanstack/react-query";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { ScoreBadge } from "../../components/ui/ScoreBadge.jsx";
import { getTopAgencies } from "../../features/agency/services/agency.service.js";
import { getTopAgents } from "../../features/directory/services/directory.service.js";
import { AGENCY_SCORE_CRITERIA, AGENT_SCORE_CRITERIA, ScoreDetailsPanel } from "../../features/scoring/ScoreDetailsPanel.jsx";

const getAgentName = (agent) => [agent?.firstName, agent?.lastName].filter(Boolean).join(" ").trim() || agent?.email || "Agent";

export const AgentScoringPage = () => {
  const agentsQuery = useQuery({
    queryKey: ["top-agents-scoreboard"],
    queryFn: () => getTopAgents({ limit: 8 })
  });

  const agenciesQuery = useQuery({
    queryKey: ["top-agencies-scoreboard"],
    queryFn: () => getTopAgencies({ limit: 8 })
  });

  return (
    <section className="space-y-8">
      <SectionTitle
        eyebrow="Scoring"
        title="Performance et classement intelligent"
        description="Classez les agents et agences avec un score sur 100 base sur avis, biens, contrats, relation client et conclusions."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Top agents</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Profils les plus fiables</h2>
            </div>
          </div>

          {agentsQuery.isLoading ? (
            <p className="text-sm text-stone-300">Chargement des agents...</p>
          ) : agentsQuery.isError ? (
            <p className="text-sm text-red-300">Impossible de charger le classement agents.</p>
          ) : !(agentsQuery.data?.items || []).length ? (
            <p className="text-sm text-stone-400">Aucun agent score pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {(agentsQuery.data?.items || []).map((agent, index) => (
                <div key={agent.userId} className="rounded-[1.5rem] border border-white/10 bg-stone-950/45 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white">#{index + 1}</span>
                      <Avatar src={agent.avatar} alt={`Photo de ${getAgentName(agent)}`} name={getAgentName(agent)} size="sm" variant="message" type="agent" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{getAgentName(agent)}</p>
                        <p className="truncate text-sm text-stone-400">{agent.agencyName || "Agent independant"}</p>
                      </div>
                    </div>
                    <ScoreBadge score={agent.score || 0} showScore />
                  </div>
                  <div className="mt-4">
                    <ScoreDetailsPanel title="Detail agent" score={agent.score || 0} details={agent.scoreDetails} criteria={AGENT_SCORE_CRITERIA} compact />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Top agences</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Structures les plus attractives</h2>
          </div>

          {agenciesQuery.isLoading ? (
            <p className="text-sm text-stone-300">Chargement des agences...</p>
          ) : agenciesQuery.isError ? (
            <p className="text-sm text-red-300">Impossible de charger le classement agences.</p>
          ) : !(agenciesQuery.data?.items || []).length ? (
            <p className="text-sm text-stone-400">Aucune agence scoree pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {(agenciesQuery.data?.items || []).map((agency, index) => (
                <div key={agency.id} className="rounded-[1.5rem] border border-white/10 bg-stone-950/45 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">#{index + 1}</p>
                      <p className="mt-1 truncate font-semibold text-white">{agency.name}</p>
                      <p className="mt-1 truncate text-sm text-stone-400">{agency.address || "Adresse non renseignee"}</p>
                    </div>
                    <ScoreBadge score={agency.score || 0} showScore />
                  </div>
                  <div className="mt-4">
                    <ScoreDetailsPanel title="Detail agence" score={agency.score || 0} details={agency.scoreDetails} criteria={AGENCY_SCORE_CRITERIA} compact />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};
