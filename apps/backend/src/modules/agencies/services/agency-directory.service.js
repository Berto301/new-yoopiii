import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../core/errors/app-error.js";
import { Property } from "../../properties/property.model.js";
import { Agency } from "../agency.model.js";
import { AgencyMember } from "../models/agency-member.model.js";

const ROLE_LABELS = {
  owner: "Proprietaire",
  manager: "Manager",
  supervisor: "Superviseur",
  agent: "Agent",
  assistant: "Assistant",
  viewer: "Observateur"
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
  updatedAt: property.updatedAt
});

const buildAgentStatsMap = async (agentIds, agencyId = null) => {
  if (!agentIds.length) {
    return new Map();
  }

  const properties = await Property.find({
    agentId: { $in: agentIds },
    ...(agencyId ? { agencyId } : {})
  })
    .select("agentId title status purpose publicationStatus averageRating updatedAt")
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

export const listAgencyDirectoryAgencies = async ({ filters }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.status && filters.status !== "all") {
    query.status = filters.status;
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
      { address: { $regex: filters.search, $options: "i" } }
    ];
  }

  const [agencies, total, memberCounts, propertyCounts] = await Promise.all([
    Agency.find(query)
      .select("name logo coverImage description address contactEmail contactPhone ratingAverage status")
      .sort({ ratingAverage: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Agency.countDocuments(query),
    AgencyMember.aggregate([
      { $match: { status: "active", role: { $ne: "owner" } } },
      { $group: { _id: "$agencyId", count: { $sum: 1 } } }
    ]),
    Property.aggregate([
      { $match: { agencyId: { $ne: null } } },
      { $group: { _id: "$agencyId", count: { $sum: 1 } } }
    ])
  ]);

  const memberCountMap = new Map(memberCounts.map((item) => [String(item._id), item.count]));
  const propertyCountMap = new Map(propertyCounts.map((item) => [String(item._id), item.count]));

  return {
    items: agencies.map((agency) => ({
      id: String(agency._id),
      name: agency.name,
      logo: agency.logo || null,
      coverImage: agency.coverImage || null,
      description: agency.description || "",
      address: agency.address || "",
      contactEmail: agency.contactEmail || "",
      contactPhone: agency.contactPhone || "",
      ratingAverage: Number(agency.ratingAverage || 0),
      status: agency.status,
      activeAgentsCount: memberCountMap.get(String(agency._id)) || 0,
      managedPropertiesCount: propertyCountMap.get(String(agency._id)) || 0
    })),
    pagination: buildPagination({ page, limit, total, itemsLength: agencies.length }),
    appliedFilters: {
      search: filters.search || "",
      status: filters.status || "all"
    }
  };
};

export const listAgencyDirectoryAgents = async ({ agencyId, filters }) => {
  const agency = await Agency.findById(agencyId).select("name status").lean();

  if (!agency) {
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  const members = await AgencyMember.find({
    agencyId,
    status: { $ne: "removed" },
    role: { $ne: "owner" },
    ...(filters.role && filters.role !== "all" ? { role: filters.role } : {})
  })
    .populate("userId", "firstName lastName email avatar role status")
    .lean();

  const searchableMembers = members
    .filter((member) => member.userId && member.userId.status === "active")
    .filter((member) => {
      if (!filters.search) {
        return true;
      }

      const haystack = [
        member.userId.firstName,
        member.userId.lastName,
        member.userId.email,
        member.role,
        member.jobTitle
      ].map(normalizeText).join(" ");

      return haystack.includes(normalizeText(filters.search));
    });

  const agentIds = searchableMembers.map((member) => member.userId._id);
  const statsMap = await buildAgentStatsMap(agentIds, agencyId);

  return {
    agency: {
      id: String(agency._id),
      name: agency.name,
      status: agency.status
    },
    items: searchableMembers.map((member) => {
      const user = member.userId;
      const stats = statsMap.get(String(user._id)) || {
        recentProperties: [],
        ratingTotal: 0,
        ratedPropertiesCount: 0,
        managedPropertiesCount: 0
      };

      return {
        id: String(member._id),
        userId: String(user._id),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        avatar: user.avatar || null,
        role: member.role,
        roleLabel: ROLE_LABELS[member.role] || member.role,
        jobTitle: member.jobTitle || "",
        membershipStatus: member.status,
        agencyId: String(agency._id),
        agencyName: agency.name,
        clientRating: stats.ratedPropertiesCount ? Number((stats.ratingTotal / stats.ratedPropertiesCount).toFixed(1)) : 0,
        managedPropertiesCount: stats.managedPropertiesCount,
        recentProperties: stats.recentProperties
      };
    }),
    appliedFilters: {
      search: filters.search || "",
      role: filters.role || "all"
    }
  };
};
