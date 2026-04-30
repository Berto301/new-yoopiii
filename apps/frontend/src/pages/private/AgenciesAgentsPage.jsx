import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentUser } from "../../app/store/session.store.js";
import { Avatar } from "../../components/profile/Avatar.jsx";
import { SectionTitle } from "../../components/shared/SectionTitle.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { ScoreBadge } from "../../components/ui/ScoreBadge.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { createConversation } from "../../features/chat/services/chat.service.js";
import { AGENCY_SCORE_CRITERIA, AGENT_SCORE_CRITERIA, ScoreDetailsPanel } from "../../features/scoring/ScoreDetailsPanel.jsx";
import { getAgencyDirectory, getAgencyDirectoryAgents, getDiscoverableAgents, rateAgent } from "../../features/directory/services/directory.service.js";
import { useNotification } from "../../hooks/useNotification.js";
import { SettingsTabButton } from "./settings/SettingsTabButton.jsx";
import ModalScoreAgent from "./ModalScoreAgent.jsx";

const tabs = [
  { id: "agency", label: "Agence" },
  { id: "agents", label: "Agents" }
];

const agencyStatusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actives" },
  { value: "inactive", label: "Inactives" },
  { value: "suspended", label: "Suspendues" }
];

const memberRoleOptions = [
  { value: "all", label: "Tous les roles" },
  { value: "owner", label: "Agence" },
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Superviseur" },
  { value: "agent", label: "Agent" },
  { value: "assistant", label: "Assistant" },
  { value: "viewer", label: "Observateur" }
];

const agentTypeOptions = [
  { value: "all", label: "Tous les profils" },
  { value: "agency", label: "En agence" },
  { value: "independent", label: "Independants" }
];

const globalRoleOptions = [
  { value: "all", label: "Tous les roles" },
  { value: "agency", label: "Agence" },
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Superviseur" },
  { value: "agent", label: "Agent" },
  { value: "assistant", label: "Assistant" },
  { value: "viewer", label: "Observateur" },
  { value: "independent_agent", label: "Agent independant" }
];

const statusLabels = {
  draft: "Brouillon",
  published: "Publie",
  reserved: "Reserve",
  sold: "Vendu",
  rented: "Loue",
  archived: "Archive"
};

const getPersonName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() || person?.email || "Profil";

const formatRating = (value) => (value > 0 ? `${value.toFixed(1)}/5` : "Non notee");

const AgentProperties = ({ properties = [] }) => {
  if (!properties.length) {
    return <p className="text-sm text-stone-400">Aucun bien recent.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {properties.map((property) => (
        <span
          key={property.id}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-200"
        >
          {property.title} - {statusLabels[property.status] || property.status}
          <ScoreBadge score={property.score || 0} />
        </span>
      ))}
    </div>
  );
};

export const AgenciesAgentsPage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const { showError, showSuccess } = useNotification();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("agency");
  const [agencySearch, setAgencySearch] = useState("");
  const [agencyStatus, setAgencyStatus] = useState("all");
  const [selectedAgencyId, setSelectedAgencyId] = useState(null);
  const [selectedAgencyName, setSelectedAgencyName] = useState("");
  const [agencyMemberSearch, setAgencyMemberSearch] = useState("");
  const [agencyMemberRole, setAgencyMemberRole] = useState("all");
  const [agentSearch, setAgentSearch] = useState("");
  const [agentType, setAgentType] = useState("all");
  const [agentRole, setAgentRole] = useState("all");
  const [agentToRate, setAgentToRate] = useState(null);

  const agenciesQuery = useQuery({
    queryKey: ["agency-directory", agencySearch, agencyStatus],
    queryFn: () => getAgencyDirectory({ search: agencySearch, status: agencyStatus, page: 1, limit: 24 }),
    enabled: currentUser?.role === "user"
  });

  useEffect(() => {
    const firstAgency = agenciesQuery.data?.items?.[0] || null;

    if (!selectedAgencyId && firstAgency) {
      setSelectedAgencyId(firstAgency.id);
      setSelectedAgencyName(firstAgency.name);
    }

    if (selectedAgencyId && !(agenciesQuery.data?.items || []).some((agency) => agency.id === selectedAgencyId)) {
      setSelectedAgencyId(firstAgency?.id || null);
      setSelectedAgencyName(firstAgency?.name || "");
    }
  }, [agenciesQuery.data?.items, selectedAgencyId]);

  const selectedAgency = useMemo(
    () => (agenciesQuery.data?.items || []).find((agency) => agency.id === selectedAgencyId) || null,
    [agenciesQuery.data?.items, selectedAgencyId]
  );

  const agencyAgentsQuery = useQuery({
    queryKey: ["agency-directory-agents", selectedAgencyId, agencyMemberSearch, agencyMemberRole],
    queryFn: () => getAgencyDirectoryAgents({ agencyId: selectedAgencyId, search: agencyMemberSearch, role: agencyMemberRole }),
    enabled: Boolean(selectedAgencyId && currentUser?.role === "user")
  });

  const discoverableAgentsQuery = useQuery({
    queryKey: ["discoverable-agents", agentSearch, agentType, agentRole],
    queryFn: () => getDiscoverableAgents({ search: agentSearch, agencyType: agentType, role: agentRole, page: 1, limit: 24 }),
    enabled: currentUser?.role === "user"
  });


  const rateAgentMutation = useMutation({
    mutationFn: ({ agent, payload }) => rateAgent({ agentId: agent.userId, payload }),
    onSuccess: () => {
      showSuccess("Note agent enregistree. Le score intelligent a ete recalcule.");
      setAgentToRate(null);
      queryClient.invalidateQueries({ queryKey: ["discoverable-agents"] });
      queryClient.invalidateQueries({ queryKey: ["agency-directory-agents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-top-agents"] });
    },
    onError: (error) => {
      showError(error?.response?.data?.message || error?.message || "Impossible d'enregistrer la note agent.");
    }
  });
  const handleContact = async (participantId) => {
    try {
      const conversation = await createConversation({ participantId });
      navigate(`/messages?conversationId=${conversation.id}`);
    } catch (error) {
      showError(error?.response?.data?.message || error?.message || "Impossible d'ouvrir la conversation.");
    }
  };

  const handleRateAgent = (agent) => {
    setAgentToRate(agent);
  };

  const canRateAgent = (agent) => !["agency", "owner", "viewer"].includes(agent?.role);

  if (currentUser?.role !== "user") {
    return (
      <section className="space-y-6">
        <SectionTitle
          eyebrow="Agence et Agents"
          title="Acces reserve aux utilisateurs"
          description="Cette page est disponible uniquement pour les comptes utilisateur."
        />
      </section>
    );
  }

  return (
    <>
      <section className="space-y-8">
      <SectionTitle
        eyebrow="Agence et Agents"
        title="Annuaire professionnel"
        description="Explorez les agences, consultez leurs agents, puis contactez directement les profils qui vous interessent depuis la messagerie."
      />

      <nav className="flex flex-wrap gap-3" aria-label="Navigation agence et agents">
        {tabs.map((tab) => (
          <SettingsTabButton
            key={tab.id}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {activeTab === "agency" ? (
        <div className="space-y-8">
          <Card>
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_220px]">
              <Input
                label="Rechercher une agence"
                value={agencySearch}
                onChange={(event) => setAgencySearch(event.target.value)}
                placeholder="Nom, description ou adresse"
              />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-200">Statut</span>
                <select
                  value={agencyStatus}
                  onChange={(event) => setAgencyStatus(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
                >
                  {agencyStatusOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-stone-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          {agenciesQuery.isLoading ? (
            <Card><p className="text-sm text-stone-300">Chargement des agences...</p></Card>
          ) : agenciesQuery.isError ? (
            <Card><p className="text-sm text-red-300">Impossible de charger les agences.</p></Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {(agenciesQuery.data?.items || []).map((agency) => (
                <button
                  key={agency.id}
                  type="button"
                  onClick={() => {
                    setSelectedAgencyId(agency.id);
                    setSelectedAgencyName(agency.name);
                  }}
                  className={selectedAgencyId === agency.id
                    ? "rounded-3xl border border-brand-500/40 bg-brand-500/10 p-0 text-left"
                    : "rounded-3xl border border-white/10 bg-white/5 p-0 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
                  }
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-semibold text-white">{agency.name}</p>
                        <p className="mt-2 text-sm text-stone-300">{agency.description || "Agence professionnelle sans description detaillee pour le moment."}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-stone-300">
                          {agency.status}
                        </span>
                        <ScoreBadge score={agency.score || 0} showScore />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-stone-300 md:grid-cols-2">
                      <p>Agents actifs: <span className="text-white">{agency.activeAgentsCount}</span></p>
                      <p>Biens geres: <span className="text-white">{agency.managedPropertiesCount}</span></p>
                      <p>Note agence: <span className="text-white">{formatRating(agency.ratingAverage)}</span></p>
                      <p>Adresse: <span className="text-white">{agency.address || "-"}</span></p>
                    </div>

                    <div className="mt-5">
                      <ScoreDetailsPanel
                        title="Score agence"
                        score={agency.score || 0}
                        details={agency.scoreDetails}
                        criteria={AGENCY_SCORE_CRITERIA}
                        compact
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedAgency ? (
            <Card className="space-y-6">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agence selectionnee</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{selectedAgencyName}</h3>
                  <p className="mt-2 text-sm text-stone-300">Liste des agents et collaborateurs visibles pour cette agence avec recherche et filtre de role.</p>
                </div>
              </div>

              <ScoreDetailsPanel
                title="Score agence selectionnee"
                score={selectedAgency.score || 0}
                details={selectedAgency.scoreDetails}
                criteria={AGENCY_SCORE_CRITERIA}
                compact
              />

              <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_220px]">
                <Input
                  label="Rechercher un agent"
                  value={agencyMemberSearch}
                  onChange={(event) => setAgencyMemberSearch(event.target.value)}
                  placeholder="Nom, email, role ou fonction"
                />

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-stone-200">Role</span>
                  <select
                    value={agencyMemberRole}
                    onChange={(event) => setAgencyMemberRole(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
                  >
                    {memberRoleOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-stone-900 text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {agencyAgentsQuery.isLoading ? (
                <p className="text-sm text-stone-300">Chargement des agents de l'agence...</p>
              ) : agencyAgentsQuery.isError ? (
                <p className="text-sm text-red-300">Impossible de charger les agents de cette agence.</p>
              ) : !(agencyAgentsQuery.data?.items || []).length ? (
                <p className="text-sm text-stone-400">Aucun agent visible pour cette agence avec les filtres actuels.</p>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {(agencyAgentsQuery.data?.items || []).map((agent) => (
                    <div key={agent.userId} className="rounded-3xl border border-white/10 bg-stone-950/40 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Avatar src={agent.avatar} alt={`Photo de ${getPersonName(agent)}`} name={getPersonName(agent)} size="md" variant="message" type="agent" />
                          <div>
                            <p className="text-lg font-semibold text-white">{getPersonName(agent)}</p>
                            <p className="mt-1 text-sm text-stone-400">{agent.roleLabel}{agent.jobTitle ? ` - ${agent.jobTitle}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <ScoreBadge score={agent.score || 0} showScore />
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                            {formatRating(agent.clientRating)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <ScoreDetailsPanel
                          title="Score agent"
                          score={agent.score || 0}
                          details={agent.scoreDetails}
                          criteria={AGENT_SCORE_CRITERIA}
                          compact
                        />
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-stone-300">
                        <p>Email: <span className="text-white">{agent.email}</span></p>
                        <p>Biens geres: <span className="text-white">{agent.managedPropertiesCount}</span></p>
                        <div>
                          <p className="mb-2 text-stone-400">Derniers biens</p>
                          <AgentProperties properties={agent.recentProperties} />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button type="button" variant="secondary" onClick={() => handleContact(agent.userId)}>
                          Contacter
                        </Button>
                        {canRateAgent(agent) ? (
                          <Button type="button" variant="ghost" onClick={() => handleRateAgent(agent)}>
                            Noter
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          <Card>
            <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_220px_220px]">
              <Input
                label="Rechercher un agent"
                value={agentSearch}
                onChange={(event) => setAgentSearch(event.target.value)}
                placeholder="Nom, email, agence ou role"
              />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-200">Type</span>
                <select
                  value={agentType}
                  onChange={(event) => setAgentType(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
                >
                  {agentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-stone-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-200">Role</span>
                <select
                  value={agentRole}
                  onChange={(event) => setAgentRole(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-stone-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-500"
                >
                  {globalRoleOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-stone-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          {discoverableAgentsQuery.isLoading ? (
            <Card><p className="text-sm text-stone-300">Chargement des agents...</p></Card>
          ) : discoverableAgentsQuery.isError ? (
            <Card><p className="text-sm text-red-300">Impossible de charger les agents.</p></Card>
          ) : !(discoverableAgentsQuery.data?.items || []).length ? (
            <Card><p className="text-sm text-stone-400">Aucun agent ne correspond a ces filtres.</p></Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {(discoverableAgentsQuery.data?.items || []).map((agent) => (
                <Card key={agent.userId} className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar src={agent.avatar} alt={`Photo de ${getPersonName(agent)}`} name={getPersonName(agent)} size="md" variant="message" type="agent" />
                      <div>
                        <p className="text-xl font-semibold text-white">{getPersonName(agent)}</p>
                        <p className="mt-1 text-sm text-stone-400">{agent.organizationLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-stone-200">
                        {agent.roleLabel}
                      </span>
                      <ScoreBadge score={agent.score || 0} showScore />
                    </div>
                  </div>

                  <ScoreDetailsPanel
                    title="Score agent"
                    score={agent.score || 0}
                    details={agent.scoreDetails}
                    criteria={AGENT_SCORE_CRITERIA}
                    compact
                  />

                  <div className="grid gap-3 text-sm text-stone-300 md:grid-cols-2">
                    <p>Note client: <span className="text-white">{formatRating(agent.clientRating)}</span></p>
                    <p>Biens geres: <span className="text-white">{agent.managedPropertiesCount}</span></p>
                    <p className="md:col-span-2">Email: <span className="text-white">{agent.email}</span></p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-200">3 derniers biens</p>
                    <AgentProperties properties={agent.recentProperties} />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={() => handleContact(agent.userId)}>
                      Discuter
                    </Button>
                    {canRateAgent(agent) ? (
                      <Button type="button" variant="secondary" onClick={() => handleRateAgent(agent)}>
                        Noter l'agent
                      </Button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      </section>
      <ModalScoreAgent
        open={Boolean(agentToRate)}
        agent={agentToRate}
        onClose={() => setAgentToRate(null)}
        isSaving={rateAgentMutation.isPending}
        onSubmit={(payload) => rateAgentMutation.mutate({ agent: agentToRate, payload })}
      />
    </>
  );
};

export default AgenciesAgentsPage;
