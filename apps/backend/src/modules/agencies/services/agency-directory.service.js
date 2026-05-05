import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../core/errors/app-error.js";
import { Property } from "../../properties/property.model.js";
import { AgentReview } from "../../users/models/agent-review.model.js";
import { Agency } from "../agency.model.js";
import { AgencyMember } from "../models/agency-member.model.js";

const ROLE_LABELS = {
  owner: "Agence",
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
  score: property.score || 0,
  scoreDetails: property.scoreDetails || null,
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
    .select("agentId title status purpose publicationStatus score scoreDetails updatedAt")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const statsMap = new Map();

  properties.forEach((property) => {
    const key = String(property.agentId);
    const existing = statsMap.get(key) || {
      recentProperties: [],
      managedPropertiesCount: 0
    };

    existing.managedPropertiesCount += 1;

    if (existing.recentProperties.length < 3) {
      existing.recentProperties.push(mapRecentProperty(property));
    }

    statsMap.set(key, existing);
  });

  return statsMap;
};

const buildAgentReviewStatsMap = async (agentIds) => {
  if (!agentIds.length) {
    return new Map();
  }

  const reviews = await AgentReview.find({ agentId: { $in: agentIds } }).select("agentId score").lean();
  const reviewStatsMap = new Map();

  reviews.forEach((review) => {
    const key = String(review.agentId);
    const existing = reviewStatsMap.get(key) || { totalScore: 0, reviewsCount: 0 };
    existing.totalScore += Number(review.score || 0);
    existing.reviewsCount += 1;
    reviewStatsMap.set(key, existing);
  });

  return reviewStatsMap;
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
      .select("name logo coverImage description address contactEmail contactPhone ratingAverage status score scoreDetails")
      .sort({ score: -1, ratingAverage: -1, createdAt: -1 })
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
      score: agency.score || 0,
      scoreDetails: agency.scoreDetails || null,
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
    ...(filters.role && filters.role !== "all" ? { role: filters.role } : {})
  })
    .populate("userId", "firstName lastName email avatar role status score scoreDetails")
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
  const [statsMap, reviewStatsMap] = await Promise.all([
    buildAgentStatsMap(agentIds, agencyId),
    buildAgentReviewStatsMap(agentIds)
  ]);

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
        managedPropertiesCount: 0
      };
      const reviewStats = reviewStatsMap.get(String(user._id)) || { totalScore: 0, reviewsCount: 0 };
      const averageScore = reviewStats.reviewsCount ? reviewStats.totalScore / reviewStats.reviewsCount : 0;

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
        score: user.score || 0,
        scoreDetails: user.scoreDetails || null,
        agencyId: String(agency._id),
        agencyName: agency.name,
        clientRating: reviewStats.reviewsCount ? Number((averageScore / 20).toFixed(1)) : 0,
        clientRatingCount: reviewStats.reviewsCount,
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
