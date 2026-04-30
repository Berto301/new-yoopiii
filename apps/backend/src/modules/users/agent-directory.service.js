import { Property } from "../properties/property.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { User } from "./user.model.js";

const ROLE_LABELS = {
  owner: "Agence",
  agency: "Agence",
  manager: "Manager",
  supervisor: "Superviseur",
  agent: "Agent",
  assistant: "Assistant",
  viewer: "Observateur",
  independent_agent: "Agent independant"
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const buildPagination = ({ page, limit, total, itemsLength }) => ({
  page,
  limit,
  total,
  hasNextPage: (page - 1) * limit + itemsLength < total
});

const mapRecentProperty = (property) => ({
  id: String(property._id),
  title: property.title,
  status: property.status,
  purpose: property.purpose,
  publicationStatus: property.publicationStatus,
  score: property.score || 0,
  scoreDetails: property.scoreDetails || null,
  updatedAt: property.updatedAt
});

const buildAgentStatsMap = async (agentIds) => {
  if (!agentIds.length) {
    return new Map();
  }

  const properties = await Property.find({ agentId: { $in: agentIds } })
    .select("agentId title status purpose publicationStatus averageRating score scoreDetails updatedAt")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const statsMap = new Map();

  properties.forEach((property) => {
    const key = String(property.agentId);
    const existing = statsMap.get(key) || {
      recentProperties: [],
      ratingTotal: 0,
      ratedPropertiesCount: 0,
      managedPropertiesCount: 0
    };

    existing.managedPropertiesCount += 1;

    if (existing.recentProperties.length < 3) {
      existing.recentProperties.push(mapRecentProperty(property));
    }

    if (typeof property.averageRating === "number" && property.averageRating > 0) {
      existing.ratingTotal += property.averageRating;
      existing.ratedPropertiesCount += 1;
    }

    statsMap.set(key, existing);
  });

  return statsMap;
};

export const listDiscoverableAgents = async ({ filters }) => {
  const [members, independentAgents] = await Promise.all([
    AgencyMember.find({ status: { $ne: "removed" } })
      .populate("userId", "firstName lastName email avatar role status score scoreDetails")
      .populate("agencyId", "name status")
      .lean(),
    User.find({ role: "independent_agent", status: "active" })
      .select("firstName lastName email avatar role status score scoreDetails")
      .lean()
  ]);

  const agencyAgents = members
    .filter((member) => member.userId && member.agencyId)
    .filter((member) => member.userId.status === "active")
    .map((member) => ({
      type: "agency",
      userId: String(member.userId._id),
      firstName: member.userId.firstName || "",
      lastName: member.userId.lastName || "",
      email: member.userId.email || "",
      avatar: member.userId.avatar || null,
      role: member.role === "owner" || member.userId.role === "agency" ? "agency" : member.role,
      roleLabel:
        member.role === "owner" || member.userId.role === "agency"
          ? ROLE_LABELS.agency
          : ROLE_LABELS[member.role] || member.role,
      agencyId: String(member.agencyId._id),
      agencyName: member.agencyId.name || "",
      organizationLabel: member.agencyId.name || "Agence",
      jobTitle: member.jobTitle || "",
      membershipStatus: member.status,
      score: member.userId.score || 0,
      scoreDetails: member.userId.scoreDetails || null
    }));

  const standaloneAgents = independentAgents.map((agent) => ({
    type: "independent",
    userId: String(agent._id),
    firstName: agent.firstName || "",
    lastName: agent.lastName || "",
    email: agent.email || "",
    avatar: agent.avatar || null,
    role: "independent_agent",
    roleLabel: ROLE_LABELS.independent_agent,
    agencyId: null,
    agencyName: null,
    organizationLabel: "Agent independant",
    jobTitle: "",
    score: agent.score || 0,
    scoreDetails: agent.scoreDetails || null
  }));

  const combinedAgents = [...agencyAgents, ...standaloneAgents]
    .filter((agent) => {
      if (filters.agencyType && filters.agencyType !== "all" && agent.type !== filters.agencyType) {
        return false;
      }

      if (filters.role && filters.role !== "all" && agent.role !== filters.role) {
        return false;
      }

      if (!filters.search) {
        return true;
      }

      const haystack = [
        agent.firstName,
        agent.lastName,
        agent.email,
        agent.organizationLabel,
        agent.roleLabel,
        agent.jobTitle
      ].map(normalizeText).join(" ");

      return haystack.includes(normalizeText(filters.search));
    })
    .sort((left, right) => (right.score || 0) - (left.score || 0) || normalizeText(`${left.firstName} ${left.lastName}`).localeCompare(normalizeText(`${right.firstName} ${right.lastName}`)));

  const agentIds = combinedAgents.map((agent) => agent.userId);
  const statsMap = await buildAgentStatsMap(agentIds);
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const start = (page - 1) * limit;
  const paginatedAgents = combinedAgents.slice(start, start + limit);

  return {
    items: paginatedAgents.map((agent) => {
      const stats = statsMap.get(agent.userId) || {
        recentProperties: [],
        ratingTotal: 0,
        ratedPropertiesCount: 0,
        managedPropertiesCount: 0
      };

      return {
        ...agent,
        clientRating: stats.ratedPropertiesCount ? Number((stats.ratingTotal / stats.ratedPropertiesCount).toFixed(1)) : 0,
        managedPropertiesCount: stats.managedPropertiesCount,
        recentProperties: stats.recentProperties
      };
    }),
    pagination: buildPagination({ page, limit, total: combinedAgents.length, itemsLength: paginatedAgents.length }),
    appliedFilters: {
      search: filters.search || "",
      agencyType: filters.agencyType || "all",
      role: filters.role || "all"
    }
  };
};
