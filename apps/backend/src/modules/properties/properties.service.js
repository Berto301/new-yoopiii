import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Agency } from "../agencies/agency.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { Booking } from "../bookings/booking.model.js";
import { getManageableManagementContractsForActor, validateActiveContractForActor } from "../contracts/contracts.service.js";
import { createNotifications } from "../notifications/notifications.service.js";
import { calculatePropertyScore, recalculateAgencyScore, recalculateAgentScore } from "../scoring/scoring.service.js";
import { OwnerMaintenanceTicket } from "../owner/models/owner-maintenance-ticket.model.js";
import { ManagementContract } from "../contracts/management-contract.model.js";
import { PropertyFavorite } from "./models/property-favorite.model.js";
import { PropertyView } from "./models/property-view.model.js";
import { Property } from "./property.model.js";
import {
  PROPERTY_THREE_D_STATUSES,
  resolvePropertyThreeDState
} from "./properties.3d.service.js";

const DEFAULT_STATUS = "published";
const EARTH_RADIUS_KM = 6378.1;

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasThreeDLink = (property) => Boolean(String(property?.threeDUrl || "").trim());
const CONTRACT_STATUS_LABELS = {
  signed: "Signe",
  accepted: "Accepte",
  active: "Actif"
};

const resolveDocumentId = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const ensureUniqueSlug = async (baseValue, excludedId = null) => {
  const baseSlug = slugify(baseValue) || `property-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 1;

  while (
    await Property.exists({
      slug: candidate,
      ...(excludedId ? { _id: { $ne: excludedId } } : {})
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const buildPropertySearchMatch = (filters) => {
  const query = {
    publicationStatus: "approved",
    status: filters.status || DEFAULT_STATUS
  };

  if (filters.type) query.type = filters.type;
  if (filters.purpose) query.purpose = filters.purpose;
  if (typeof filters.bedrooms === "number") query.bedrooms = { $gte: filters.bedrooms };
  if (typeof filters.bathrooms === "number") query.bathrooms = { $gte: filters.bathrooms };

  if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
    query.price = {};
    if (typeof filters.minPrice === "number") query.price.$gte = filters.minPrice;
    if (typeof filters.maxPrice === "number") query.price.$lte = filters.maxPrice;
  }

  if (typeof filters.minArea === "number" || typeof filters.maxArea === "number") {
    query.area = {};
    if (typeof filters.minArea === "number") query.area.$gte = filters.minArea;
    if (typeof filters.maxArea === "number") query.area.$lte = filters.maxArea;
  }

  return query;
};

const buildManagedPropertyMatch = ({ actor, filters }) => {
  const query = {};

  if (filters.publicationStatus) query.publicationStatus = filters.publicationStatus;
  if (filters.status) query.status = filters.status;

  if (actor.role === "proprietaire") {
    query.ownerUserId = actor.id;
    return query;
  }

  if (actor.role === "agency") {
    if (!actor.agencyId) {
      throw new AppError("Agency context not found", StatusCodes.BAD_REQUEST);
    }

    query.agencyId = actor.agencyId;
    return query;
  }

  if (actor.role === "agency_agent") {
    if (filters.scope === "agency") {
      if (!actor.agencyId) {
        throw new AppError("Agency context not found", StatusCodes.BAD_REQUEST);
      }

      query.agencyId = actor.agencyId;
      return query;
    }

    query.agentId = actor.id;
    return query;
  }

  if (actor.role !== "independent_agent") {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  query.agentId = actor.id;
  query.ownerType = "independent_agent";
  return query;
};

const buildBoundsGeometry = (filters) => ({
  $geoWithin: {
    $box: [
      [filters.southWestLng, filters.southWestLat],
      [filters.northEastLng, filters.northEastLat]
    ]
  }
});

const buildCircleGeometry = (filters) => ({
  $geoWithin: {
    $centerSphere: [[filters.lng, filters.lat], filters.radiusKm / EARTH_RADIUS_KM]
  }
});

const buildProjection = () => ({
  title: 1,
  slug: 1,
  description: 1,
  type: 1,
  purpose: 1,
  price: 1,
  currency: 1,
  area: 1,
  rooms: 1,
  bedrooms: 1,
  bathrooms: 1,
  features: 1,
  address: 1,
  location: 1,
  coverImage: 1,
  media: 1,
  is3DEnabled: 1,
  has3DView: 1,
  threeDUrl: 1,
  threeDStatus: 1,
  threeDGeneratedAt: 1,
  threeDSourceMedia: 1,
  status: 1,
  publicationStatus: 1,
  averageRating: 1,
  favoriteCount: 1,
  score: 1,
  scoreDetails: 1,
  agentId: 1,
  agencyId: 1,
  ownerType: 1,
  distanceInMeters: 1,
  distanceInKm: 1,
  createdAt: 1,
  updatedAt: 1
});

const buildDistanceFields = () => ({
  distanceInKm: {
    $round: [{ $divide: ["$distanceInMeters", 1000] }, 2]
  }
});

const buildMapMarker = (property) => ({
  lat: property.location.coordinates[1],
  lng: property.location.coordinates[0],
  label: `${property.price} ${property.currency}`
});

const mapPropertyListItem = (property, favoriteIds = new Set()) => {
  const propertyHasThreeDLink = hasThreeDLink(property);
  const threeDUrl = propertyHasThreeDLink ? String(property.threeDUrl).trim() : null;

  return {
    id: String(property._id || property.id),
    title: property.title,
    slug: property.slug,
    description: property.description,
    type: property.type,
    purpose: property.purpose,
    price: property.price,
    currency: property.currency,
    area: property.area,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    features: property.features || [],
    address: property.address,
    location: property.location,
    coverImage: property.coverImage,
    media: property.media || [],
    is3DEnabled: propertyHasThreeDLink,
    has3DView: propertyHasThreeDLink,
    threeDUrl,
    threeDStatus: propertyHasThreeDLink ? PROPERTY_THREE_D_STATUSES.GENERATED : null,
    threeDGeneratedAt: propertyHasThreeDLink ? property.threeDGeneratedAt || null : null,
    threeDSourceMedia: [],
    status: property.status,
    publicationStatus: property.publicationStatus,
    averageRating: property.averageRating,
    favoriteCount: property.favoriteCount || 0,
    score: property.score || 0,
    scoreDetails: property.scoreDetails || null,
    agentId: property.agentId?._id ? String(property.agentId._id) : property.agentId,
    agentName:
      property.agentName ||
      [property.agentId?.firstName, property.agentId?.lastName].filter(Boolean).join(" ").trim() ||
      "Agent",
    agentAvatar: property.agentAvatar || property.agentId?.avatar || null,
    agencyId: property.agencyId?._id ? String(property.agencyId._id) : property.agencyId,
    agencyName: property.agencyName || property.agencyId?.name || null,
    ownerType: property.ownerType,
    ownerUserId: property.ownerUserId?._id ? String(property.ownerUserId._id) : property.ownerUserId || null,
    ownerName:
      property.ownerName ||
      [property.ownerUserId?.firstName, property.ownerUserId?.lastName].filter(Boolean).join(" ").trim() ||
      "",
    ownerAvatar: property.ownerAvatar || property.ownerUserId?.avatar || null,
    ownerPhone: property.ownerPhone || property.ownerUserId?.phone || "",
    ownerEmail: property.ownerEmail || property.ownerUserId?.email || "",
    publicationOwnerDisplay: property.publicationOwnerDisplay || null,
    isUnderMaintenance: Boolean(property.isUnderMaintenance),
    managementContractId: property.managementContractId?._id ? String(property.managementContractId._id) : property.managementContractId || null,
    managementContract: property.managementContract || null,
    duplicatedFromPropertyId: property.duplicatedFromPropertyId?._id ? String(property.duplicatedFromPropertyId._id) : property.duplicatedFromPropertyId || null,
    isDuplicated: Boolean(property.duplicatedFromPropertyId),
    contractRequestId: property.contractRequestId?._id ? String(property.contractRequestId._id) : property.contractRequestId || null,
    contractRequestStatus: property.contractRequestStatus || "none",
    contractRequestedAt: property.contractRequestedAt || null,
    reservedByUserId: property.reservedByUserId?._id ? String(property.reservedByUserId._id) : property.reservedByUserId || null,
    reservedAt: property.reservedAt || null,
    distanceInMeters: property.distanceInMeters ?? null,
    distanceInKm: property.distanceInKm ?? null,
    isFavorite: favoriteIds.has(String(property._id)),
    isReserved: property.status === "reserved",
    mapMarker: buildMapMarker(property),
    createdAt: property.createdAt,
    updatedAt: property.updatedAt
  };
};

const buildPagination = ({ page, limit, total, itemsLength }) => ({
  page,
  limit,
  total,
  hasNextPage: (page - 1) * limit + itemsLength < total
});

const buildSearchResponse = ({ items, totalResults, page, limit, appliedFilters, map, favoriteIds }) => ({
  items: items.map((item) => mapPropertyListItem(item, favoriteIds)),
  map,
  pagination: buildPagination({ page, limit, total: totalResults, itemsLength: items.length }),
  appliedFilters
});

const buildAppliedFilters = (filters) => ({
  type: filters.type || null,
  purpose: filters.purpose || null,
  status: filters.status || DEFAULT_STATUS,
  minPrice: filters.minPrice ?? null,
  maxPrice: filters.maxPrice ?? null,
  bedrooms: filters.bedrooms ?? null,
  bathrooms: filters.bathrooms ?? null,
  minArea: filters.minArea ?? null,
  maxArea: filters.maxArea ?? null
});

const readAggregationCount = (rows) => rows[0]?.total || 0;

const loadFavoriteIdsForUser = async (userId, propertyIds) => {
  if (!userId || !propertyIds.length) {
    return new Set();
  }

  const favorites = await PropertyFavorite.find({ userId, propertyId: { $in: propertyIds } }).select("propertyId").lean();
  return new Set(favorites.map((favorite) => String(favorite.propertyId)));
};

const resolveWorkflowRecipients = async (property, actorId) => {
  const recipientIds = new Set();

  if (property.agencyId) {
    const [agency, members] = await Promise.all([
      Agency.findById(property.agencyId).select("ownerUserId").lean(),
      AgencyMember.find({ agencyId: property.agencyId, status: "active" }).select("userId").lean()
    ]);

    if (agency?.ownerUserId) recipientIds.add(String(agency.ownerUserId));
    members.forEach((member) => recipientIds.add(String(member.userId)));
  }

  if (property.agentId) recipientIds.add(String(property.agentId));

  const favoriteUserIds = await PropertyFavorite.distinct("userId", { propertyId: property._id });
  favoriteUserIds.forEach((userId) => recipientIds.add(String(userId)));
  recipientIds.delete(String(actorId));

  return [...recipientIds];
};

const createPropertyWorkflowNotifications = async ({ property, actor, previousStatus, previousPublicationStatus, eventType = "property_workflow_updated" }) => {
  const recipientIds = await resolveWorkflowRecipients(property, actor.id);
  if (!recipientIds.length) return;

  const movement = [];
  if (previousStatus !== property.status) movement.push(`status ${previousStatus} -> ${property.status}`);
  if (previousPublicationStatus !== property.publicationStatus) movement.push(`publication ${previousPublicationStatus} -> ${property.publicationStatus}`);
  if (!movement.length) movement.push("mise a jour des informations");

  await createNotifications(
    recipientIds.map((userId) => ({
      userId,
      type: eventType,
      title: `Mouvement sur ${property.title}`,
      body: `Le bien ${property.title} a ete mis a jour: ${movement.join(", ")}.`,
      data: {
        propertyId: property._id,
        slug: property.slug,
        status: property.status,
        publicationStatus: property.publicationStatus,
        actorId: actor.id
      },
      channel: "in_app"
    }))
  );
};

const createPropertyActivityNotification = async ({ property, actor, type, title, body }) => {
  const recipientIds = new Set(await resolveWorkflowRecipients(property, actor.id));

  if (property.ownerUserId) {
    recipientIds.add(String(property.ownerUserId));
  }

  if (property.agentId) {
    recipientIds.add(String(property.agentId));
  }

  await createNotifications(
    [...recipientIds]
      .filter((userId) => userId !== String(actor.id))
      .map((userId) => ({
        userId,
        type,
        title,
        body,
        data: {
        propertyId: property._id,
        propertyTitle: property.title,
        slug: property.slug,
        actorId: actor.id,
          managementContractId: property.managementContractId || null
        },
        channel: "in_app"
      }))
  );
};

const buildContractRequestReference = async (property) => {
  const baseValue = `REQ-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(property._id).slice(-6).toUpperCase()}`;
  let candidate = baseValue;
  let suffix = 1;

  while (await ManagementContract.exists({ reference: candidate })) {
    candidate = `${baseValue}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const assertDuplicateContractRequestAccess = (property, actor) => {
  if (!["agency", "agency_agent", "independent_agent"].includes(actor.role)) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (!property.duplicatedFromPropertyId) {
    throw new AppError("Only duplicated properties can request an owner contract", StatusCodes.BAD_REQUEST);
  }

  if (property.managementContractId) {
    throw new AppError("This duplicated property is already linked to a contract", StatusCodes.BAD_REQUEST);
  }

  if (!property.ownerUserId) {
    throw new AppError("Owner not found for this property", StatusCodes.BAD_REQUEST);
  }

  if (actor.role === "independent_agent" && String(property.agentId || "") !== String(actor.id)) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (actor.role === "agency" && String(property.agencyId || "") !== String(actor.agencyId || "")) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (actor.role === "agency_agent") {
    const sameAgency = actor.agencyId && String(property.agencyId || "") === String(actor.agencyId);
    const sameAgent = String(property.agentId || "") === String(actor.id);

    if (!sameAgency && !sameAgent) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
    }
  }
};

const mapContractRequest = (contract) => ({
  id: String(contract._id || contract.id),
  reference: contract.reference,
  status: contract.status,
  propertyId: contract.propertyId ? String(contract.propertyId) : null
});

const createFavoriteNotification = async ({ userId, property, action }) => {
  await createNotifications([
    {
      userId,
      type: action === "added" ? "property_favorited" : "property_unfavorited",
      title: action === "added" ? "Bien ajoute aux favoris" : "Bien retire des favoris",
      body: `${property.title} a ete ${action === "added" ? "ajoute a" : "retire de"} vos favoris.`,
      data: {
        propertyId: property._id,
        slug: property.slug,
        favoriteState: action === "added"
      },
      channel: "in_app"
    }
  ]);
};

const createReservationNotifications = async ({ property, userId, action }) => {
  const recipientIds = new Set();

  if (property.agentId) {
    recipientIds.add(String(property.agentId?._id || property.agentId));
  }

  if (property.agencyId) {
    const agency = await Agency.findById(property.agencyId).select("ownerUserId").lean();
    if (agency?.ownerUserId) {
      recipientIds.add(String(agency.ownerUserId));
    }
  }

  if (userId) {
    recipientIds.add(String(userId));
  }

  await createNotifications(
    [...recipientIds].map((recipientId) => ({
      userId: recipientId,
      type: action === "reserved" ? "property_reserved" : "property_reservation_released",
      title: action === "reserved" ? "Bien reserve" : "Reservation annulee",
      body:
        action === "reserved"
          ? `${property.title} est maintenant reserve.`
          : `${property.title} n'est plus reserve et redevient disponible.`,
      data: {
        propertyId: property._id,
        slug: property.slug,
        reservedByUserId: userId
      },
      channel: "in_app"
    }))
  );
};


const syncRelatedBusinessScores = async (property) => {
  const plainProperty = property?.toObject?.() || property || {};
  const tasks = [];

  if (plainProperty.agentId) {
    tasks.push(recalculateAgentScore(plainProperty.agentId));
  }

  if (plainProperty.agencyId) {
    tasks.push(recalculateAgencyScore(plainProperty.agencyId));
  }

  await Promise.all(tasks.map((task) => task.catch(() => null)));
};

const syncPropertyScore = async (property, { syncBusinessScores = true } = {}) => {
  if (!property) return property;

  try {
    const calculated = await calculatePropertyScore(property);
    property.score = calculated.score;
    property.scoreDetails = calculated.scoreDetails;

    if (typeof property.save === "function") {
      await property.save();
    } else if (property._id) {
      await Property.updateOne(
        { _id: property._id },
        { $set: { score: calculated.score, scoreDetails: calculated.scoreDetails } }
      );
      property.score = calculated.score;
      property.scoreDetails = calculated.scoreDetails;
    }

    if (syncBusinessScores) {
      await syncRelatedBusinessScores(property);
    }
  } catch (_error) {
    // Scoring must never block the main property workflow.
  }

  return property;
};
const ensurePropertyExists = async (propertyId) => {
  const property = await Property.findById(propertyId);
  if (!property) throw new AppError("Property not found", StatusCodes.NOT_FOUND);
  return property;
};

const ensurePropertyManagementAccess = async (property, actor, requiredAction = null) => {
  if (actor.role === "proprietaire") {
    const ownerUserId = property.ownerUserId?._id || property.ownerUserId || "";

    if (String(ownerUserId) !== String(actor.id)) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
    }

    if (requiredAction === "publish") {
      throw new AppError("Le proprietaire ne peut pas publier ce bien directement", StatusCodes.FORBIDDEN);
    }

    if (requiredAction === "reserve") {
      throw new AppError("Le proprietaire ne peut pas reserver ce bien directement", StatusCodes.FORBIDDEN);
    }

    return;
  }

  let contract = null;

  if (!property.managementContractId) {
    const contractScope = await buildManageableContractScope(actor);
    contract = contractScope.contractByPropertyId.get(resolveDocumentId(property._id || property.id)) || null;

    if (!contract) {
      throw new AppError("This property is no longer manageable because it is not linked to an active contract", StatusCodes.FORBIDDEN);
    }
  } else {
    contract = await validateActiveContractForActor({ contractId: String(property.managementContractId), actor });
  }

  if (requiredAction === "publish" && !contract.actions?.canPublishProperty) {
    throw new AppError("Ce contrat n'autorise pas la publication du bien", StatusCodes.FORBIDDEN);
  }

  if (requiredAction === "reserve" && !contract.actions?.canReserveProperty) {
    throw new AppError("Ce contrat n'autorise pas la reservation du bien", StatusCodes.FORBIDDEN);
  }

  if (requiredAction === "edit" && !contract.actions?.canEditProperty) {
    throw new AppError("Ce contrat n'autorise pas la modification du bien", StatusCodes.FORBIDDEN);
  }

  if (requiredAction === "delete" && !contract.actions?.canDeleteProperty) {
    throw new AppError("Ce contrat n'autorise pas la suppression du bien", StatusCodes.FORBIDDEN);
  }

  if (actor.role === "agency") {
    if (contract.managerRole === "agency" && resolveDocumentId(contract.agencyId) === resolveDocumentId(actor.agencyId)) {
      return contract;
    }

    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (actor.role === "agency_agent") {
    if (
      contract.managerRole === "agency" &&
      resolveDocumentId(contract.agencyId) === resolveDocumentId(actor.agencyId) &&
      resolveDocumentId(contract.responsibleAgentUserId) === resolveDocumentId(actor.id)
    ) {
      return contract;
    }

    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (
    actor.role === "independent_agent" &&
    contract.managerRole === "independent_agent" &&
    resolveDocumentId(contract.managerUserId) === resolveDocumentId(actor.id)
  ) {
    return contract;
  }

  throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
};

const mapManagedSummary = async (matchQuery) => {
  const [total, published, pendingApproval, favorites] = await Promise.all([
    Property.countDocuments(matchQuery),
    Property.countDocuments({ ...matchQuery, status: "published", publicationStatus: "approved" }),
    Property.countDocuments({ ...matchQuery, publicationStatus: "pending" }),
    Property.aggregate([{ $match: matchQuery }, { $group: { _id: null, totalFavorites: { $sum: "$favoriteCount" } } }])
  ]);

  return { total, published, pendingApproval, totalFavorites: favorites[0]?.totalFavorites || 0 };
};

const mapManagementContractSummary = (contract) => {
  if (!contract) return null;

  const responsibleAgent = contract.responsibleAgentUserId
    ? {
        id: resolveDocumentId(contract.responsibleAgentUserId),
        fullName: [contract.responsibleAgentUserId.firstName, contract.responsibleAgentUserId.lastName].filter(Boolean).join(" ").trim(),
        email: contract.responsibleAgentUserId.email || ""
      }
    : null;

  return {
    id: String(contract._id || contract.id),
    reference: contract.reference,
    status: contract.status,
    statusLabel: CONTRACT_STATUS_LABELS[contract.status] || contract.status,
    propertyId: contract.propertyId ? String(contract.propertyId) : null,
    manager: contract.managerRole === "agency"
      ? {
          role: "agency",
          id: resolveDocumentId(contract.agencyId),
          name: contract.agencyId?.name || "Agence"
        }
      : {
          role: "independent_agent",
          id: resolveDocumentId(contract.managerUserId),
          name: [contract.managerUserId?.firstName, contract.managerUserId?.lastName].filter(Boolean).join(" ").trim() || contract.managerUserId?.email || "Agent"
        },
    responsibleAgent,
    actions: {
      canPublishProperty: Boolean(contract.actions?.canPublishProperty ?? true),
      canReserveProperty: Boolean(contract.actions?.canReserveProperty ?? true),
      canEditProperty: Boolean(contract.actions?.canEditProperty),
      canDeleteProperty: Boolean(contract.actions?.canDeleteProperty),
      publicationOwnerDisplay: {
        showOwnerName: Boolean(contract.actions?.publicationOwnerDisplay?.showOwnerName),
        showOwnerContact: Boolean(contract.actions?.publicationOwnerDisplay?.showOwnerContact),
        allowDirectOwnerChat: Boolean(contract.actions?.publicationOwnerDisplay?.allowDirectOwnerChat)
      }
    }
  };
};

const buildManagedPropertyFilterMatch = (filters) => {
  const query = {};

  if (filters.publicationStatus) query.publicationStatus = filters.publicationStatus;
  if (filters.status) query.status = filters.status;

  return query;
};

const buildManageableContractScope = async (actor) => {
  const contracts = await getManageableManagementContractsForActor(actor);
  const contractIds = contracts.map((contract) => String(contract._id));
  const contractById = new Map(contracts.map((contract) => [String(contract._id), contract]));
  const contractByPropertyId = new Map();

  contracts.forEach((contract) => {
    const propertyId = resolveDocumentId(contract.propertyId);
    if (propertyId && !contractByPropertyId.has(propertyId)) {
      contractByPropertyId.set(propertyId, contract);
    }
  });

  return { contracts, contractIds, contractById, contractByPropertyId };
};

const resolveManagedPropertyContract = (property, contractScope) => {
  const linkedContract = contractScope.contractById.get(resolveDocumentId(property.managementContractId));

  if (linkedContract) {
    return linkedContract;
  }

  return contractScope.contractByPropertyId.get(resolveDocumentId(property._id || property.id)) || null;
};

const applyContractManagementContext = (property, contract) => {
  if (!contract) {
    return property;
  }

  const contractAgentId =
    contract.managerRole === "agency"
      ? contract.responsibleAgentUserId?._id || contract.responsibleAgentUserId || property.agentId
      : contract.managerUserId?._id || contract.managerUserId || property.agentId;

  return {
    ...property,
    ownerType: contract.managerRole || property.ownerType,
    ownerUserId: contract.ownerUserId?._id || contract.ownerUserId || property.ownerUserId,
    managementContractId: contract._id || contract.id || property.managementContractId,
    agencyId: contract.managerRole === "agency" ? contract.agencyId?._id || contract.agencyId : null,
    agentId: contractAgentId,
    managementContract: mapManagementContractSummary(contract)
  };
};

const buildContractLinkedPropertyMatch = ({ contractScope, filters }) => {
  const matchQuery = buildManagedPropertyFilterMatch(filters);
  const directPropertyIds = [...contractScope.contractByPropertyId.keys()];
  const clauses = [];

  if (contractScope.contractIds.length) {
    clauses.push({ managementContractId: { $in: contractScope.contractIds } });
  }

  if (directPropertyIds.length) {
    clauses.push({ _id: { $in: directPropertyIds } });
  }

  return {
    ...matchQuery,
    ...(clauses.length ? { $or: clauses } : {})
  };
};

const buildManagedPropertyPayload = async ({ actor, payload, existingProperty = null, duplicate = false }) => {
  const nextManagementContractId = payload.managementContractId ?? existingProperty?.managementContractId;
  const nextTitle = payload.title ?? existingProperty?.title;
  const nextDescription = payload.description ?? existingProperty?.description;
  const nextType = payload.type ?? existingProperty?.type;
  const nextPurpose = payload.purpose ?? existingProperty?.purpose;
  const nextPrice = payload.price ?? existingProperty?.price;
  const nextCurrency = (payload.currency ?? existingProperty?.currency ?? "USD").trim().toUpperCase();
  const nextArea = payload.area ?? existingProperty?.area ?? 0;
  const nextRooms = payload.rooms ?? existingProperty?.rooms ?? 0;
  const nextBedrooms = payload.bedrooms ?? existingProperty?.bedrooms ?? 0;
  const nextBathrooms = payload.bathrooms ?? existingProperty?.bathrooms ?? 0;
  const nextFeatures = payload.features ?? existingProperty?.features ?? [];
  const nextAddress = payload.address ?? existingProperty?.address;
  const nextLat = payload.location?.lat ?? existingProperty?.location?.coordinates?.[1];
  const nextLng = payload.location?.lng ?? existingProperty?.location?.coordinates?.[0];
  const nextCoverImage = payload.coverImage ?? existingProperty?.coverImage ?? null;
  const nextMedia = payload.media ?? existingProperty?.media ?? [];
  const nextThreeDState = resolvePropertyThreeDState({ payload, existingProperty });
  const normalizedThreeDState =
    duplicate && nextThreeDState.is3DEnabled
      ? {
          ...nextThreeDState,
          is3DEnabled: false,
          has3DView: false,
          threeDUrl: null,
          threeDStatus: null,
          threeDGeneratedAt: null,
          threeDSourceMedia: []
        }
      : nextThreeDState;
  const nextStatus = duplicate ? "draft" : payload.status ?? existingProperty?.status ?? "draft";
  const nextPublicationStatus = duplicate ? "pending" : payload.publicationStatus ?? existingProperty?.publicationStatus ?? "pending";
  let ownerType = actor.role === "independent_agent" ? "independent_agent" : "agency";
  let ownerUserId = existingProperty?.ownerUserId || null;
  let managementContractId = nextManagementContractId || null;
  let agentId = existingProperty?.agentId ?? actor.id;
  let agencyId = actor.role === "independent_agent" ? null : actor.agencyId || existingProperty?.agencyId || null;

  if (actor.role === "proprietaire") {
    ownerType = "proprietaire";
    ownerUserId = actor.id;
    agencyId = null;
    agentId = existingProperty?.agentId ?? actor.id;

    if (managementContractId) {
      const contract = await validateActiveContractForActor({ contractId: String(managementContractId), actor });
      ownerType = contract.managerRole;
      ownerUserId = contract.ownerUserId?._id || contract.ownerUserId;
      managementContractId = contract._id || contract.id;
      agencyId = contract.managerRole === "agency" ? contract.agencyId?._id || contract.agencyId : null;
      agentId =
        contract.managerRole === "agency"
          ? contract.responsibleAgentUserId?._id || contract.responsibleAgentUserId || actor.id
          : contract.managerUserId?._id || contract.managerUserId || actor.id;
    }
  } else {
    if (!nextManagementContractId) {
      throw new AppError("A signed, accepted or active contract is required to manage this property", StatusCodes.BAD_REQUEST);
    }

    const activeContract = await validateActiveContractForActor({ contractId: String(nextManagementContractId), actor });
    ownerType = actor.role === "independent_agent" ? "independent_agent" : "agency";
    ownerUserId = activeContract.ownerUserId?._id || activeContract.ownerUserId;
    managementContractId = activeContract._id || activeContract.id;
    agentId =
      activeContract.managerRole === "agency"
        ? activeContract.responsibleAgentUserId?._id || activeContract.responsibleAgentUserId || existingProperty?.agentId || actor.id
        : activeContract.managerUserId?._id || activeContract.managerUserId || existingProperty?.agentId || actor.id;
    agencyId = activeContract.managerRole === "agency" ? activeContract.agencyId?._id || activeContract.agencyId : null;
  }

  return {
    title: nextTitle,
    slug: await ensureUniqueSlug(duplicate ? `${nextTitle} copie` : nextTitle, existingProperty?._id),
    description: nextDescription,
    type: nextType,
    purpose: nextPurpose,
    price: nextPrice,
    currency: nextCurrency,
    area: nextArea,
    rooms: nextRooms,
    bedrooms: nextBedrooms,
    bathrooms: nextBathrooms,
    features: nextFeatures,
    address: nextAddress,
    location: {
      type: "Point",
      coordinates: [nextLng, nextLat]
    },
    coverImage: nextCoverImage,
    media: nextMedia.map((item, index) => ({
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || null,
      order: item.order ?? index
    })),
    is3DEnabled: normalizedThreeDState.is3DEnabled,
    has3DView: normalizedThreeDState.has3DView,
    threeDUrl: normalizedThreeDState.threeDUrl,
    threeDStatus: normalizedThreeDState.threeDStatus,
    threeDGeneratedAt: normalizedThreeDState.threeDGeneratedAt,
    threeDSourceMedia: normalizedThreeDState.threeDSourceMedia,
    status: nextStatus,
    publicationStatus: nextPublicationStatus,
    ownerType,
    ownerUserId,
    managementContractId,
    agentId,
    agencyId
  };
};

export const searchNearbyProperties = async (filters, currentUser = null) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const baseQuery = buildPropertySearchMatch(filters);
  const maxDistance = filters.radiusKm * 1000;

  const [items, totalRows] = await Promise.all([
    Property.aggregate([
      { $geoNear: { near: { type: "Point", coordinates: [filters.lng, filters.lat] }, distanceField: "distanceInMeters", maxDistance, spherical: true, query: baseQuery } },
      { $addFields: buildDistanceFields() },
      { $project: buildProjection() },
      { $sort: { distanceInMeters: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]),
    Property.aggregate([{ $match: { ...baseQuery, location: buildCircleGeometry(filters) } }, { $count: "total" }])
  ]);

  const favoriteIds = await loadFavoriteIdsForUser(currentUser?.id, items.map((item) => item._id));

  return buildSearchResponse({ items, totalResults: readAggregationCount(totalRows), page, limit, favoriteIds, appliedFilters: { ...buildAppliedFilters(filters), radiusKm: filters.radiusKm }, map: { center: { lat: filters.lat, lng: filters.lng }, radiusKm: filters.radiusKm, bounds: null } });
};

export const searchPropertiesInBounds = async (filters, currentUser = null) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const baseQuery = buildPropertySearchMatch(filters);
  const boundsQuery = buildBoundsGeometry(filters);
  const shouldSortByDistance = typeof filters.lat === "number" && typeof filters.lng === "number";

  const listPipeline = shouldSortByDistance
    ? [{ $geoNear: { near: { type: "Point", coordinates: [filters.lng, filters.lat] }, distanceField: "distanceInMeters", spherical: true, query: baseQuery } }, { $match: { location: boundsQuery } }, { $addFields: buildDistanceFields() }, { $project: buildProjection() }, { $sort: { distanceInMeters: 1, createdAt: -1 } }, { $skip: skip }, { $limit: limit }]
    : [{ $match: { ...baseQuery, location: boundsQuery } }, { $project: buildProjection() }, { $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }];

  const countPipeline = shouldSortByDistance
    ? [{ $geoNear: { near: { type: "Point", coordinates: [filters.lng, filters.lat] }, distanceField: "distanceInMeters", spherical: true, query: baseQuery } }, { $match: { location: boundsQuery } }, { $count: "total" }]
    : [{ $match: { ...baseQuery, location: boundsQuery } }, { $count: "total" }];

  const [items, totalRows] = await Promise.all([Property.aggregate(listPipeline), Property.aggregate(countPipeline)]);
  const favoriteIds = await loadFavoriteIdsForUser(currentUser?.id, items.map((item) => item._id));

  return buildSearchResponse({ items, totalResults: readAggregationCount(totalRows), page, limit, favoriteIds, appliedFilters: buildAppliedFilters(filters), map: { center: shouldSortByDistance ? { lat: filters.lat, lng: filters.lng } : null, radiusKm: null, bounds: { northEast: { lat: filters.northEastLat, lng: filters.northEastLng }, southWest: { lat: filters.southWestLat, lng: filters.southWestLng } } } });
};

export const getManagedProperties = async ({ user, filters }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const matchQuery = buildManagedPropertyMatch({ actor: user, filters });

  if (user.role === "proprietaire") {
    const [items, total, summary] = await Promise.all([
      Property.find(matchQuery).sort({ score: -1, updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Property.countDocuments(matchQuery),
      mapManagedSummary(matchQuery)
    ]);

    return {
      items: items.map((item) => mapPropertyListItem(item)),
      summary,
      pagination: buildPagination({ page, limit, total, itemsLength: items.length }),
      appliedFilters: { scope: "own", status: filters.status || null, publicationStatus: filters.publicationStatus || null }
    };
  }

  const contractScope = await buildManageableContractScope(user);

  if (!contractScope.contractIds.length) {
    return {
      items: [],
      summary: { total: 0, published: 0, pendingApproval: 0, totalFavorites: 0 },
      pagination: buildPagination({ page, limit, total: 0, itemsLength: 0 }),
      appliedFilters: { scope: filters.scope || (user.role === "agency" ? "agency" : "own"), status: filters.status || null, publicationStatus: filters.publicationStatus || null }
    };
  }

  const contractLinkedMatchQuery = buildContractLinkedPropertyMatch({ contractScope, filters });

  const [items, total, summary] = await Promise.all([
    Property.find(contractLinkedMatchQuery).sort({ score: -1, updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Property.countDocuments(contractLinkedMatchQuery),
    mapManagedSummary(contractLinkedMatchQuery)
  ]);

  return {
    items: items.map((item) => mapPropertyListItem(applyContractManagementContext(item, resolveManagedPropertyContract(item, contractScope)))),
    summary,
    pagination: buildPagination({ page, limit, total, itemsLength: items.length }),
    appliedFilters: { scope: filters.scope || (user.role === "agency" ? "agency" : "own"), status: filters.status || null, publicationStatus: filters.publicationStatus || null }
  };
};

export const getPropertyPublications = async ({ user, filters }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const query = {
    ...buildPropertySearchMatch({
      ...filters,
      status: filters.status || undefined
    }),
    publicationStatus: "approved",
    ...(filters.status ? { status: filters.status } : { status: { $in: ["published", "reserved"] } }),
    ...(filters.agentId ? { agentId: filters.agentId } : {})
  };

  const textClauses = [];

  if (filters.search) {
    const searchRegex = new RegExp(escapeRegex(filters.search), "i");
    textClauses.push({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { address: searchRegex }
      ]
    });
  }

  if (filters.location) {
    const locationRegex = new RegExp(escapeRegex(filters.location), "i");
    textClauses.push({ address: locationRegex });
  }

  if (textClauses.length) {
    query.$and = [...(query.$and || []), ...textClauses];
  }

  const [items, total] = await Promise.all([
    Property.find(query)
      .populate("agentId", "firstName lastName")
      .populate("agencyId", "name")
      .populate("ownerUserId", "firstName lastName email phone avatar")
      .sort({ score: -1, updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(query)
  ]);

  const contractIds = [...new Set(items.map((item) => String(item.managementContractId || "")).filter(Boolean))];
  const contracts = contractIds.length
    ? await ManagementContract.find({ _id: { $in: contractIds } })
      .populate("ownerUserId", "firstName lastName email phone avatar")
      .select("actions ownerUserId")
      .lean()
    : [];
  const contractById = new Map(
    contracts.map((contract) => [
      String(contract._id),
      {
        publicationOwnerDisplay: {
          showOwnerName: Boolean(contract.actions?.publicationOwnerDisplay?.showOwnerName),
          showOwnerContact: Boolean(contract.actions?.publicationOwnerDisplay?.showOwnerContact),
          allowDirectOwnerChat: Boolean(contract.actions?.publicationOwnerDisplay?.allowDirectOwnerChat)
        },
        ownerUserId: contract.ownerUserId?._id ? String(contract.ownerUserId._id) : String(contract.ownerUserId || ""),
        ownerName: [contract.ownerUserId?.firstName, contract.ownerUserId?.lastName].filter(Boolean).join(" ").trim(),
        ownerAvatar: contract.ownerUserId?.avatar || null,
        ownerPhone: contract.ownerUserId?.phone || "",
        ownerEmail: contract.ownerUserId?.email || ""
      }
    ])
  );

  const favoriteIds = await loadFavoriteIdsForUser(user?.id, items.map((item) => item._id));
  const maintenancePropertyIds = items.length
    ? await OwnerMaintenanceTicket.distinct("managedPropertyId", {
      managedPropertyId: { $in: items.map((item) => item._id) },
      status: "in_progress"
    })
    : [];
  const maintenancePropertyIdSet = new Set(maintenancePropertyIds.map((propertyId) => String(propertyId)));

  return {
    items: items.map((item) => ({
      ...mapPropertyListItem({
        ...item,
        ownerName: contractById.get(String(item.managementContractId || ""))?.ownerName || [item.ownerUserId?.firstName, item.ownerUserId?.lastName].filter(Boolean).join(" ").trim(),
        ownerAvatar: contractById.get(String(item.managementContractId || ""))?.ownerAvatar || item.ownerUserId?.avatar || null,
        ownerPhone: contractById.get(String(item.managementContractId || ""))?.ownerPhone || item.ownerUserId?.phone || "",
        ownerEmail: contractById.get(String(item.managementContractId || ""))?.ownerEmail || item.ownerUserId?.email || "",
        publicationOwnerDisplay: contractById.get(String(item.managementContractId || ""))?.publicationOwnerDisplay || null,
        isUnderMaintenance: maintenancePropertyIdSet.has(String(item._id))
      }, favoriteIds),
      isReservedByCurrentUser: String(item.reservedByUserId || "") === String(user?.id || "")
    })),
    pagination: buildPagination({ page, limit, total, itemsLength: items.length }),
    appliedFilters: {
      agentId: filters.agentId || null,
      search: filters.search || null,
      location: filters.location || null,
      type: filters.type || null,
      purpose: filters.purpose || null,
      status: filters.status || null,
      minPrice: filters.minPrice ?? null,
      maxPrice: filters.maxPrice ?? null,
      bedrooms: filters.bedrooms ?? null,
      bathrooms: filters.bathrooms ?? null,
      minArea: filters.minArea ?? null,
      maxArea: filters.maxArea ?? null
    }
  };
};

export const getPublicPropertyDetail = async ({ identifier, user = null }) => {
  const normalizedIdentifier = String(identifier || "").trim();
  const publicQuery = {
    publicationStatus: "approved",
    status: { $in: ["published", "reserved", "sold", "rented"] }
  };
  const identityClauses = [{ slug: normalizedIdentifier }];

  if (mongoose.isValidObjectId(normalizedIdentifier)) {
    identityClauses.push({ _id: normalizedIdentifier });
  }

  const property = await Property.findOne({
    ...publicQuery,
    $or: identityClauses
  })
    .populate("agentId", "firstName lastName avatar")
    .populate("agencyId", "name logo")
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .lean();

  if (!property) {
    throw new AppError("Property not found", StatusCodes.NOT_FOUND);
  }

  const contract = property.managementContractId
    ? await ManagementContract.findById(property.managementContractId)
      .populate("ownerUserId", "firstName lastName email phone avatar")
      .select("actions ownerUserId")
      .lean()
    : null;

  const favoriteIds = await loadFavoriteIdsForUser(user?.id, [property._id]);
  const isUnderMaintenance = await OwnerMaintenanceTicket.exists({
    managedPropertyId: property._id,
    status: "in_progress"
  });

  return mapPropertyListItem({
    ...property,
    ownerName:
      [contract?.ownerUserId?.firstName, contract?.ownerUserId?.lastName].filter(Boolean).join(" ").trim() ||
      [property.ownerUserId?.firstName, property.ownerUserId?.lastName].filter(Boolean).join(" ").trim(),
    ownerAvatar: contract?.ownerUserId?.avatar || property.ownerUserId?.avatar || null,
    ownerPhone: contract?.ownerUserId?.phone || property.ownerUserId?.phone || "",
    ownerEmail: contract?.ownerUserId?.email || property.ownerUserId?.email || "",
    publicationOwnerDisplay: contract
      ? {
          showOwnerName: Boolean(contract.actions?.publicationOwnerDisplay?.showOwnerName),
          showOwnerContact: Boolean(contract.actions?.publicationOwnerDisplay?.showOwnerContact),
          allowDirectOwnerChat: Boolean(contract.actions?.publicationOwnerDisplay?.allowDirectOwnerChat)
        }
      : null,
    isUnderMaintenance: Boolean(isUnderMaintenance)
  }, favoriteIds);
};

export const getManagedPropertyDetail = async ({ identifier, actor }) => {
  const normalizedIdentifier = String(identifier || "").trim();
  const identityClauses = [{ slug: normalizedIdentifier }];

  if (mongoose.isValidObjectId(normalizedIdentifier)) {
    identityClauses.push({ _id: normalizedIdentifier });
  }

  const property = await Property.findOne({ $or: identityClauses })
    .populate("agentId", "firstName lastName avatar")
    .populate("agencyId", "name logo")
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .lean();

  if (!property) {
    throw new AppError("Property not found", StatusCodes.NOT_FOUND);
  }

  const contract = await ensurePropertyManagementAccess(property, actor);

  const favoriteIds = await loadFavoriteIdsForUser(actor?.id, [property._id]);
  const isUnderMaintenance = await OwnerMaintenanceTicket.exists({
    managedPropertyId: property._id,
    status: "in_progress"
  });

  return mapPropertyListItem({
    ...applyContractManagementContext(property, contract),
    isUnderMaintenance: Boolean(isUnderMaintenance)
  }, favoriteIds);
};

export const createManagedProperty = async ({ actor, payload }) => {
  if (!["agency", "agency_agent", "independent_agent", "proprietaire"].includes(actor.role)) throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  const data = await buildManagedPropertyPayload({ actor, payload });
  const property = await Property.create(data);
  await syncPropertyScore(property);
  await createPropertyActivityNotification({
    property,
    actor,
    type: "property.created",
    title: `Bien ${property.title} cree`,
    body: `Le bien ${property.title} a ete ajoute au portefeuille et est maintenant suivi dans l'espace de gestion.`
  });
  return mapPropertyListItem(property.toObject());
};

export const updateManagedProperty = async ({ propertyId, actor, payload }) => {
  const property = await ensurePropertyExists(propertyId);
  await ensurePropertyManagementAccess(property, actor, "edit");
  const previousStatus = property.status;
  const previousPublicationStatus = property.publicationStatus;
  const previousAgentId = String(property.agentId || "");
  const data = await buildManagedPropertyPayload({ actor, payload, existingProperty: property });
  Object.assign(property, data);
  await property.save();
  await syncPropertyScore(property);

  await createPropertyActivityNotification({
    property,
    actor,
    type: "property.updated",
    title: `Bien ${property.title} modifie`,
    body: `Le bien ${property.title} a ete modifie avec succes.`
  });

  if (previousStatus !== property.status || previousPublicationStatus !== property.publicationStatus) {
    await createPropertyWorkflowNotifications({ property, actor, previousStatus, previousPublicationStatus, eventType: "property_updated" });
  }

  if (previousAgentId && previousAgentId !== String(property.agentId || "")) {
    await createPropertyActivityNotification({
      property,
      actor,
      type: "crm.agent.changed",
      title: `Agent responsable modifie: ${property.title}`,
      body: `L'agent responsable du bien ${property.title} a ete mis a jour.`,
    });
  }

  return mapPropertyListItem(property.toObject());
};

export const duplicateManagedProperty = async ({ propertyId, actor, payload }) => {
  const property = await ensurePropertyExists(propertyId);
  await ensurePropertyManagementAccess(property, actor);
  const data = await buildManagedPropertyPayload({ actor, payload: { ...property.toObject(), ...payload }, existingProperty: property, duplicate: true });

  if (actor.role !== "proprietaire") {
    data.managementContractId = null;
    data.duplicatedFromPropertyId = property._id;
    data.contractRequestId = null;
    data.contractRequestStatus = "none";
    data.contractRequestedAt = null;
  }

  const duplicate = await Property.create(data);
  await syncPropertyScore(duplicate);
  return mapPropertyListItem(duplicate.toObject());
};

export const requestDuplicatePropertyContract = async ({ propertyId, actor }) => {
  const property = await ensurePropertyExists(propertyId);
  assertDuplicateContractRequestAccess(property, actor);

  if (property.contractRequestId) {
    const existingContract = await ManagementContract.findById(property.contractRequestId).lean();

    if (existingContract && !["terminated", "expired", "cancelled"].includes(existingContract.status)) {
      property.contractRequestStatus = existingContract.status;
      await property.save();

      return {
        property: mapPropertyListItem(property.toObject()),
        contractRequest: mapContractRequest(existingContract)
      };
    }
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const managerRole = actor.role === "independent_agent" ? "independent_agent" : "agency";
  const agencyId = managerRole === "agency" ? property.agencyId || actor.agencyId : null;
  const managerUserId = managerRole === "independent_agent" ? actor.id : null;
  const responsibleAgentUserId = property.agentId || actor.id;
  const agency = agencyId ? await Agency.findById(agencyId).select("name").lean() : null;
  const reference = await buildContractRequestReference(property);

  const contract = await ManagementContract.create({
    reference,
    contractType: managerRole === "agency" ? "agency" : "agent",
    status: "pending_signature",
    startDate: now,
    endDate,
    ownerUserId: property.ownerUserId,
    agencyId,
    managerUserId,
    responsibleAgentUserId,
    managerRole,
    propertyId: property._id,
    agency: {
      id: agencyId,
      name: agency?.name || "",
      commission: 0,
      fees: 0
    },
    agent: {
      id: responsibleAgentUserId,
      name: "",
      commission: 0,
      fees: 0
    },
    financial: {
      rentAmount: property.purpose === "rent" ? Number(property.price || 0) : 0,
      charges: 0,
      deposit: 0,
      currency: property.currency || "USD",
      paymentFrequency: "monthly",
      paymentMethod: ""
    },
    actions: {
      canPublishProperty: true,
      canReserveProperty: true,
      canEditProperty: true,
      canDeleteProperty: false,
      publicationOwnerDisplay: {
        showOwnerName: false,
        showOwnerContact: false,
        allowDirectOwnerChat: false
      }
    },
    notes: `Demande de contrat creee depuis le bien duplique ${property.title}.`,
    terms: "",
    createdByUserId: actor.id
  });

  property.contractRequestId = contract._id;
  property.contractRequestStatus = contract.status;
  property.contractRequestedAt = now;
  await property.save();

  await createNotifications([
    {
      userId: property.ownerUserId,
      type: "contract.request.created",
      title: `Demande de contrat pour ${property.title}`,
      body: `Une demande de contrat a ete envoyee pour le bien duplique ${property.title}.`,
      data: {
        propertyId: property._id,
        propertyTitle: property.title,
        contractId: contract._id,
        contractReference: contract.reference,
        actorId: actor.id
      },
      channel: "in_app"
    }
  ]);

  return {
    property: mapPropertyListItem(property.toObject()),
    contractRequest: mapContractRequest(contract)
  };
};

export const deleteManagedProperty = async ({ propertyId, actor }) => {
  const property = await ensurePropertyExists(propertyId);
  await ensurePropertyManagementAccess(property, actor, "delete");
  await createPropertyActivityNotification({
    property,
    actor,
    type: "property.deleted",
    title: `Bien ${property.title} supprime`,
    body: `Le bien ${property.title} a ete retire de l'espace de gestion.`
  });
  await PropertyFavorite.deleteMany({ propertyId });
  await PropertyView.deleteMany({ propertyId });
  await property.deleteOne();
  return { success: true, propertyId };
};

export const updatePropertyWorkflow = async ({ propertyId, actor, payload }) => {
  const property = await ensurePropertyExists(propertyId);
  const requiredAction =
    payload.status === "reserved"
      ? "reserve"
      : payload.publicationStatus === "approved" || payload.status === "published"
        ? "publish"
        : null;
  await ensurePropertyManagementAccess(property, actor, requiredAction);
  const previousStatus = property.status;
  const previousPublicationStatus = property.publicationStatus;
  if (payload.status) property.status = payload.status;
  if (payload.publicationStatus) property.publicationStatus = payload.publicationStatus;
  if (payload.status && payload.status !== "reserved") {
    property.reservedByUserId = null;
    property.reservedAt = null;
  }
  await property.save();
  await syncPropertyScore(property);
  if (previousStatus !== property.status || previousPublicationStatus !== property.publicationStatus) {
    await createPropertyWorkflowNotifications({ property, actor, previousStatus, previousPublicationStatus });
  }
  return mapPropertyListItem(property.toObject());
};

export const addPropertyToFavorites = async ({ propertyId, userId }) => {
  const property = await ensurePropertyExists(propertyId);
  const favorite = await PropertyFavorite.findOne({ propertyId, userId }).lean();
  if (!favorite) {
    await PropertyFavorite.create({ propertyId, userId });
    await Property.updateOne({ _id: propertyId }, { $inc: { favoriteCount: 1 } });
    const scoredFavoriteProperty = await Property.findById(propertyId);
    await syncPropertyScore(scoredFavoriteProperty);
    await createFavoriteNotification({ userId, property, action: "added" });
  }
  const refreshed = await Property.findById(propertyId).lean();
  return { property: mapPropertyListItem(refreshed, new Set([String(propertyId)])), favoriteState: true };
};

export const removePropertyFromFavorites = async ({ propertyId, userId }) => {
  const property = await ensurePropertyExists(propertyId);
  const favorite = await PropertyFavorite.findOneAndDelete({ propertyId, userId }).lean();
  if (favorite) {
    await Property.updateOne({ _id: propertyId }, { $inc: { favoriteCount: -1 } });
    const scoredFavoriteProperty = await Property.findById(propertyId);
    await syncPropertyScore(scoredFavoriteProperty);
    await createFavoriteNotification({ userId, property, action: "removed" });
  }
  const refreshed = await Property.findById(propertyId).lean();
  return { property: mapPropertyListItem(refreshed), favoriteState: false };
};

export const reserveProperty = async ({ propertyId, user }) => {
  const property = await ensurePropertyExists(propertyId);

  if (property.publicationStatus !== "approved" || property.status === "draft" || property.status === "archived") {
    throw new AppError("Property is not available for reservation", StatusCodes.BAD_REQUEST);
  }

  if (String(property.agentId) === String(user.id)) {
    throw new AppError("Agents cannot reserve their own property", StatusCodes.BAD_REQUEST);
  }

  if (property.status === "reserved") {
    if (String(property.reservedByUserId || "") === String(user.id)) {
      return {
        property: {
          ...mapPropertyListItem(property.toObject()),
          isReservedByCurrentUser: true
        },
        reservationState: true
      };
    }

    throw new AppError("Property already reserved", StatusCodes.CONFLICT);
  }

  property.status = "reserved";
  property.reservedByUserId = user.id;
  property.reservedAt = new Date();
  await property.save();
  await syncPropertyScore(property);

  await Booking.findOneAndUpdate(
    {
      propertyId: property._id,
      userId: user.id,
      status: { $in: ["pending", "confirmed"] }
    },
    {
      $set: {
        agentId: property.agentId,
        agencyId: property.agencyId || null,
        requestedDate: new Date(),
        timeSlot: "Reservation immediate",
        message: "Reservation effectuee depuis les publications.",
        status: "confirmed",
        source: "property_page"
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  await createReservationNotifications({ property, userId: user.id, action: "reserved" });

  return {
    property: {
      ...mapPropertyListItem(property.toObject()),
      isReservedByCurrentUser: true
    },
    reservationState: true
  };
};

export const releasePropertyReservation = async ({ propertyId, actor }) => {
  const property = await ensurePropertyExists(propertyId);
  await ensurePropertyManagementAccess(property, actor);

  if (property.status !== "reserved") {
    return {
      property: mapPropertyListItem(property.toObject()),
      reservationState: false
    };
  }

  const previousStatus = property.status;
  const previousPublicationStatus = property.publicationStatus;
  const reservedByUserId = property.reservedByUserId;

  property.status = "published";
  property.reservedByUserId = null;
  property.reservedAt = null;
  await property.save();
  await syncPropertyScore(property);

  if (reservedByUserId) {
    await Booking.updateMany(
      {
        propertyId: property._id,
        userId: reservedByUserId,
        status: { $in: ["pending", "confirmed"] }
      },
      {
        $set: {
          status: "cancelled",
          message: "Reservation annulee manuellement par l'agent."
        }
      }
    );
  }

  await createReservationNotifications({ property, userId: reservedByUserId, action: "released" });
  await createPropertyWorkflowNotifications({
    property,
    actor,
    previousStatus,
    previousPublicationStatus,
    eventType: "property_reservation_released"
  });

  return {
    property: mapPropertyListItem(property.toObject()),
    reservationState: false
  };
};

export const getPropertyFavorites = async ({ userId, filters }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const [favorites, total] = await Promise.all([
    PropertyFavorite.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PropertyFavorite.countDocuments({ userId })
  ]);
  const propertyIds = favorites.map((item) => item.propertyId);
  const properties = await Property.find({ _id: { $in: propertyIds } }).populate("agentId", "firstName lastName avatar").lean();
  const propertyMap = new Map(properties.map((property) => [String(property._id), property]));
  const favoriteIds = new Set(propertyIds.map(String));
  return { items: favorites.map((favorite) => propertyMap.get(String(favorite.propertyId))).filter(Boolean).map((property) => mapPropertyListItem(property, favoriteIds)), pagination: buildPagination({ page, limit, total, itemsLength: favorites.length }) };
};

export const markPropertyAsViewed = async ({ propertyId, userId, source }) => {
  const property = await ensurePropertyExists(propertyId);
  property.viewCount = (property.viewCount || 0) + 1;
  await syncPropertyScore(property);
  const view = await PropertyView.findOneAndUpdate({ propertyId, userId }, { $set: { viewedAt: new Date(), source } }, { new: true, upsert: true }).lean();
  return view;
};

export const getPropertyHistory = async ({ userId, filters }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;
  const [views, total] = await Promise.all([
    PropertyView.find({ userId }).sort({ viewedAt: -1 }).skip(skip).limit(limit).lean(),
    PropertyView.countDocuments({ userId })
  ]);
  const propertyIds = views.map((view) => view.propertyId);
  const properties = await Property.find({ _id: { $in: propertyIds } }).populate("agentId", "firstName lastName avatar").lean();
  const propertyMap = new Map(properties.map((property) => [String(property._id), property]));
  const favoriteIds = await loadFavoriteIdsForUser(userId, propertyIds);
  return { items: views.map((view) => { const property = propertyMap.get(String(view.propertyId)); if (!property) return null; return { viewedAt: view.viewedAt, source: view.source, property: mapPropertyListItem(property, favoriteIds) }; }).filter(Boolean), pagination: buildPagination({ page, limit, total, itemsLength: views.length }) };
};
