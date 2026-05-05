import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Agency } from "../agencies/agency.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { Booking } from "../bookings/booking.model.js";
import { ManagementContract } from "../contracts/management-contract.model.js";
import { Message } from "../conversations/message.model.js";
import { Property } from "../properties/property.model.js";
import { User } from "../users/user.model.js";
import { AgentReview } from "../users/models/agent-review.model.js";

const AGENT_ROLES = ["independent_agent", "agency_agent"];
const CLOSED_PROPERTY_STATUSES = ["sold", "rented"];
const ACTIVE_PROPERTY_STATUSES = ["published", "reserved"];
const CLOSED_CONTRACT_STATUSES = ["signed", "accepted", "active"];
const CLOSED_BOOKING_STATUSES = ["confirmed", "completed"];

const clampScore = (value) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const roundScore = (value) => Math.round(clampScore(value));
const toPlainObject = (value) => value?.toObject?.() || value || {};
const numeric = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const uniqueRecommendations = (items) => [...new Set(items.filter(Boolean))].slice(0, 6);
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeScoreDetails = (details) => ({
  ...details,
  recommendations: uniqueRecommendations(details.recommendations || []),
  calculatedAt: new Date()
});

const getEntityId = (entity) => String(entity?._id || entity?.id || "");

const hasValidCoordinates = (location) => {
  const coordinates = location?.coordinates;
  return Array.isArray(coordinates)
    && coordinates.length === 2
    && Number.isFinite(Number(coordinates[0]))
    && Number.isFinite(Number(coordinates[1]));
};

const hasThreeDLink = (property) => Boolean(String(property?.threeDUrl || "").trim());

const getPropertyImages = (property) => {
  const images = (property.media || []).filter((item) => item?.url && (!item.type || item.type === "image"));
  const coverImage = property.coverImage ? [{ url: property.coverImage, type: "image", order: -1 }] : [];
  const unique = new Map([...coverImage, ...images].map((item) => [String(item.url), item]));
  return [...unique.values()];
};

const extractAddressToken = (address) => {
  const normalized = String(address || "").trim();
  if (!normalized) return "";
  const commaToken = normalized.split(",").map((part) => part.trim()).find((part) => part.length >= 3);
  if (commaToken) return commaToken;
  return normalized.split(/\s+/).slice(0, 3).join(" ");
};

const scorePropertyPrice = async (property) => {
  const recommendations = [];
  const price = numeric(property.price);
  const area = numeric(property.area);

  if (price <= 0) {
    return {
      score: 20,
      recommendations: ["Renseignez un prix fiable pour permettre la comparaison marche."]
    };
  }

  const baseQuery = {
    _id: { $ne: property._id },
    type: property.type,
    purpose: property.purpose,
    currency: property.currency || "USD",
    price: { $gt: 0 },
    status: { $ne: "archived" }
  };

  if (area > 0) {
    baseQuery.area = { $gte: Math.max(1, area * 0.65), $lte: area * 1.35 };
  }

  const addressToken = extractAddressToken(property.address);
  const addressQuery = addressToken ? { ...baseQuery, address: { $regex: escapeRegex(addressToken), $options: "i" } } : baseQuery;

  let comparables = await Property.find(addressQuery).select("price area").limit(40).lean();

  if (comparables.length < 3 && addressToken) {
    comparables = await Property.find(baseQuery).select("price area").limit(40).lean();
  }

  const currentUnitPrice = area > 0 ? price / area : price;
  const comparableUnitPrices = comparables
    .map((item) => {
      const comparablePrice = numeric(item.price);
      const comparableArea = numeric(item.area);
      return area > 0 && comparableArea > 0 ? comparablePrice / comparableArea : comparablePrice;
    })
    .filter((value) => value > 0);

  if (!comparableUnitPrices.length) {
    const fallbackScore = area > 0 ? 68 : 55;
    if (area <= 0) recommendations.push("Ajoutez la surface pour ameliorer le calcul prix au m2.");
    recommendations.push("Le marche local manque encore de comparables pour affiner le prix.");
    return { score: fallbackScore, recommendations };
  }

  const marketAverage = comparableUnitPrices.reduce((sum, value) => sum + value, 0) / comparableUnitPrices.length;
  const ratio = currentUnitPrice / marketAverage;
  let score = 88;

  if (ratio < 0.6) {
    score = 84;
    recommendations.push("Le prix est tres attractif; verifiez qu'il reste coherent avec le dossier du bien.");
  } else if (ratio < 0.85) {
    score = 94;
  } else if (ratio <= 1.08) {
    score = 90;
  } else if (ratio <= 1.2) {
    score = 74;
    recommendations.push("Le prix est legerement au-dessus du marche local similaire.");
  } else if (ratio <= 1.35) {
    score = 56;
    recommendations.push("Le prix semble superieur au marche local; ajustez ou justifiez la valeur.");
  } else {
    score = 36;
    recommendations.push("Le prix parait nettement trop eleve face aux biens comparables.");
  }

  return { score, recommendations };
};

const scorePropertyLocation = (property) => {
  const recommendations = [];
  const address = String(property.address || "").trim();
  const featuresText = (property.features || []).join(" ").toLowerCase();
  const hasCoordinates = hasValidCoordinates(property.location);
  const hasDetailedAddress = address.length >= 8;
  const hasSpecificArea = address.includes(",") || address.split(/\s+/).length >= 4;
  const amenityKeywords = ["transport", "bus", "metro", "taxi", "ecole", "school", "commerce", "marche", "securite", "parking", "access"];
  const hasAmenities = amenityKeywords.some((keyword) => featuresText.includes(keyword) || address.toLowerCase().includes(keyword));

  let score = 0;
  if (hasCoordinates) score += 35;
  if (hasDetailedAddress) score += 25;
  if (hasSpecificArea) score += 20;
  if (hasAmenities) score += 20;

  if (!hasCoordinates) recommendations.push("Ajoutez une position GPS precise pour renforcer la qualite de localisation.");
  if (!hasDetailedAddress || !hasSpecificArea) recommendations.push("Completez l'adresse avec ville, quartier et reperes utiles.");
  if (!hasAmenities) recommendations.push("Mentionnez les transports, ecoles, commerces ou points forts du quartier.");

  return { score: Math.max(score, hasDetailedAddress ? 45 : 20), recommendations };
};

const scorePropertyPhotos = (property) => {
  const recommendations = [];
  const images = getPropertyImages(property);
  const videos = (property.media || []).filter((item) => item?.url && item.type === "video");
  const imageCount = images.length;
  let score = Math.min(50, imageCount * 10);

  if (property.coverImage) score += 20;
  if (hasThreeDLink(property)) score += 15;
  if (videos.length) score += 10;
  if ((property.media || []).some((item) => Number.isFinite(Number(item.order)))) score += 5;

  if (imageCount < 5) recommendations.push("Ajoutez plus de photos pour ameliorer la visibilite de l'annonce.");
  if (!property.coverImage) recommendations.push("Ajoutez une photo de couverture forte pour mieux capter l'attention.");
  if (!hasThreeDLink(property)) recommendations.push("Ajoutez un lien de visite 3D ou video immersive pour augmenter l'attractivite.");

  return { score, recommendations };
};

const scorePropertyHistory = async (property) => {
  const recommendations = [];
  const viewCount = numeric(property.viewCount);
  const favoriteCount = numeric(property.favoriteCount);
  const bookingCount = property._id
    ? await Booking.countDocuments({ propertyId: property._id, status: { $in: CLOSED_BOOKING_STATUSES } })
    : 0;
  const updatedAt = property.updatedAt ? new Date(property.updatedAt) : null;
  const ageInDays = updatedAt ? Math.floor((Date.now() - updatedAt.getTime()) / 86400000) : 999;

  let score = 0;
  score += Math.min(35, viewCount * 2);
  score += Math.min(25, favoriteCount * 5);
  score += Math.min(20, bookingCount * 10);

  if (CLOSED_PROPERTY_STATUSES.includes(property.status)) score += 20;
  else if (property.status === "reserved") score += 16;
  else if (property.status === "published") score += 12;
  else score += 5;

  if (ageInDays <= 14) score += 20;
  else if (ageInDays <= 60) score += 12;
  else recommendations.push("Mettez l'annonce a jour pour relancer son attractivite.");

  if (viewCount < 10) recommendations.push("Renforcez la diffusion de l'annonce pour augmenter les vues.");
  if (favoriteCount < 3) recommendations.push("Ameliorez titre, photos ou prix pour generer plus de favoris.");

  return { score, recommendations };
};

export const calculatePropertyScore = async (propertyInput) => {
  const property = toPlainObject(propertyInput);
  const [price, location, photo, history] = await Promise.all([
    scorePropertyPrice(property),
    Promise.resolve(scorePropertyLocation(property)),
    Promise.resolve(scorePropertyPhotos(property)),
    scorePropertyHistory(property)
  ]);

  const priceScore = roundScore(price.score);
  const locationScore = roundScore(location.score);
  const photoScore = roundScore(photo.score);
  const historyScore = roundScore(history.score);
  const score = roundScore(
    priceScore * 0.35
    + locationScore * 0.25
    + photoScore * 0.2
    + historyScore * 0.2
  );

  return {
    score,
    scoreDetails: makeScoreDetails({
      priceScore,
      locationScore,
      photoScore,
      historyScore,
      recommendations: [
        ...price.recommendations,
        ...location.recommendations,
        ...photo.recommendations,
        ...history.recommendations
      ]
    })
  };
};

export const recalculatePropertyScore = async (propertyId) => {
  const property = await Property.findById(propertyId);
  if (!property) throw new AppError("Property not found", StatusCodes.NOT_FOUND);

  const calculated = await calculatePropertyScore(property);
  property.score = calculated.score;
  property.scoreDetails = calculated.scoreDetails;
  await property.save();

  return {
    propertyId: String(property._id),
    globalScore: property.score,
    score: property.score,
    scoreDetails: property.scoreDetails
  };
};

export const recalculateAllPropertyScores = async () => {
  const properties = await Property.find({}).select("_id").lean();
  let updated = 0;

  for (const property of properties) {
    await recalculatePropertyScore(property._id);
    updated += 1;
  }

  return { updated };
};

export const getPropertyScore = async (propertyId) => {
  const property = await Property.findById(propertyId).select("score scoreDetails").lean();
  if (!property) throw new AppError("Property not found", StatusCodes.NOT_FOUND);

  if (!property.scoreDetails?.calculatedAt) {
    return recalculatePropertyScore(propertyId);
  }

  return {
    propertyId: String(property._id),
    globalScore: property.score || 0,
    score: property.score || 0,
    scoreDetails: property.scoreDetails || null
  };
};

const scoreAgentRatings = async (agentId) => {
  const reviews = await AgentReview.find({ agentId }).select("score createdAt").lean();
  const recommendations = [];

  if (!reviews.length) {
    return {
      score: 45,
      reviewsCount: 0,
      recommendations: ["Demandez aux clients satisfaits de laisser une note agent."]
    };
  }

  const average = reviews.reduce((sum, review) => sum + numeric(review.score), 0) / reviews.length;
  const confidence = 0.65 + Math.min(reviews.length, 20) / 20 * 0.35;
  const recentReviews = reviews.filter((review) => Date.now() - new Date(review.createdAt).getTime() <= 90 * 86400000);
  const freshnessBonus = Math.min(8, recentReviews.length * 2);
  const score = average * confidence + freshnessBonus;

  if (average < 70) recommendations.push("Analysez les retours clients recents pour ameliorer la satisfaction.");
  if (reviews.length < 5) recommendations.push("Augmentez le nombre d'avis pour fiabiliser le score agent.");

  return { score, reviewsCount: reviews.length, recommendations };
};

const scoreAgentProperties = async (agentId) => {
  const properties = await Property.find({ agentId }).select("score status publicationStatus updatedAt").lean();
  const recommendations = [];

  if (!properties.length) {
    return {
      score: 35,
      managedPropertiesCount: 0,
      recommendations: ["Ajoutez ou rattachez des biens actifs au portefeuille de l'agent."]
    };
  }

  const averagePropertyScore = properties.reduce((sum, property) => sum + numeric(property.score), 0) / properties.length;
  const activeCount = properties.filter((property) => ACTIVE_PROPERTY_STATUSES.includes(property.status)).length;
  const concludedCount = properties.filter((property) => CLOSED_PROPERTY_STATUSES.includes(property.status)).length;
  const score = averagePropertyScore * 0.62
    + Math.min(20, properties.length * 4)
    + (activeCount / properties.length) * 10
    + Math.min(8, concludedCount * 4);

  if (averagePropertyScore < 60) recommendations.push("Maintenez les biens a jour pour ameliorer le score moyen du portefeuille.");
  if (!activeCount) recommendations.push("Publiez davantage de biens actifs pour renforcer la visibilite commerciale.");

  return { score, managedPropertiesCount: properties.length, recommendations };
};

const scoreAgentContracts = async (agentId) => {
  const contracts = await ManagementContract.find({
    $or: [{ responsibleAgentUserId: agentId }, { managerUserId: agentId }]
  }).select("status createdAt signatureDate").lean();
  const recommendations = [];

  if (!contracts.length) {
    return {
      score: 40,
      contractsCount: 0,
      recommendations: ["Augmentez le nombre de contrats conclus pour renforcer la performance commerciale."]
    };
  }

  const concludedCount = contracts.filter((contract) => CLOSED_CONTRACT_STATUSES.includes(contract.status)).length;
  const activeCount = contracts.filter((contract) => contract.status === "active").length;
  const conversionScore = contracts.length ? (concludedCount / contracts.length) * 50 : 0;
  const volumeScore = Math.min(30, concludedCount * 8);
  const activeScore = Math.min(20, activeCount * 5);
  const score = conversionScore + volumeScore + activeScore;

  if (concludedCount < Math.max(1, contracts.length * 0.5)) recommendations.push("Travaillez le taux de conversion des contrats signes ou acceptes.");
  if (!activeCount) recommendations.push("Transformez les contrats en mandats actifs pour stabiliser le score.");

  return { score, contractsCount: contracts.length, recommendations };
};

const scoreClientRelation = async (agentId) => {
  const [sentMessages, reports, completedBookings] = await Promise.all([
    Message.countDocuments({ senderId: agentId, isDeleted: { $ne: true } }),
    Message.countDocuments({ senderId: agentId, messageType: { $in: ["communication_report", "visit_report"] }, isDeleted: { $ne: true } }),
    Booking.countDocuments({ agentId, status: "completed" })
  ]);
  const recommendations = [];
  const score = Math.min(35, sentMessages / 5)
    + Math.min(30, reports * 10)
    + Math.min(25, completedBookings * 6)
    + (sentMessages > 0 ? 10 : 0);

  if (sentMessages < 25) recommendations.push("Ameliorer le delai et le volume de reponse aux clients.");
  if (reports < 2) recommendations.push("Creez plus de rapports de visite ou de communication pour ameliorer le suivi.");
  if (!completedBookings) recommendations.push("Honorez et finalisez davantage de rendez-vous clients.");

  return { score, recommendations };
};

export const calculateAgentScore = async (agentInput) => {
  const agent = toPlainObject(agentInput);
  const agentId = getEntityId(agent);
  const [rating, property, contract, clientRelation] = await Promise.all([
    scoreAgentRatings(agentId),
    scoreAgentProperties(agentId),
    scoreAgentContracts(agentId),
    scoreClientRelation(agentId)
  ]);

  const ratingScore = roundScore(rating.score);
  const propertyScore = roundScore(property.score);
  const contractScore = roundScore(contract.score);
  const clientRelationScore = roundScore(clientRelation.score);
  const score = roundScore(
    ratingScore * 0.35
    + propertyScore * 0.25
    + contractScore * 0.25
    + clientRelationScore * 0.15
  );

  return {
    score,
    scoreDetails: makeScoreDetails({
      ratingScore,
      propertyScore,
      contractScore,
      clientRelationScore,
      recommendations: [
        ...rating.recommendations,
        ...property.recommendations,
        ...contract.recommendations,
        ...clientRelation.recommendations
      ]
    })
  };
};

const ensureAgent = async (agentId) => {
  const agent = await User.findById(agentId);
  if (!agent) throw new AppError("Agent not found", StatusCodes.NOT_FOUND);
  if (!AGENT_ROLES.includes(agent.role)) {
    throw new AppError("Selected profile is not an agent", StatusCodes.BAD_REQUEST);
  }
  return agent;
};

export const recalculateAgentScore = async (agentId) => {
  const agent = await ensureAgent(agentId);
  const calculated = await calculateAgentScore(agent);
  agent.score = calculated.score;
  agent.scoreDetails = calculated.scoreDetails;
  await agent.save();

  return {
    agentId: String(agent._id),
    globalScore: agent.score,
    score: agent.score,
    scoreDetails: agent.scoreDetails
  };
};

export const recalculateAllAgentScores = async () => {
  const agents = await User.find({ role: { $in: AGENT_ROLES }, status: "active" }).select("_id").lean();
  let updated = 0;

  for (const agent of agents) {
    await recalculateAgentScore(agent._id);
    updated += 1;
  }

  return { updated };
};

export const getAgentScore = async (agentId) => {
  const agent = await ensureAgent(agentId);

  if (!agent.scoreDetails?.calculatedAt) {
    return recalculateAgentScore(agentId);
  }

  return {
    agentId: String(agent._id),
    globalScore: agent.score || 0,
    score: agent.score || 0,
    scoreDetails: agent.scoreDetails || null
  };
};

export const submitAgentReview = async ({ agentId, userId, payload }) => {
  if (String(agentId) === String(userId)) {
    throw new AppError("You cannot rate yourself", StatusCodes.BAD_REQUEST);
  }

  const agent = await ensureAgent(agentId);
  const review = await AgentReview.findOneAndUpdate(
    { agentId, userId },
    {
      $set: {
        score: roundScore(payload.score),
        description: payload.description || "",
        criteria: payload.criteria || {}
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const score = await recalculateAgentScore(agentId);

  if (agent.agencyId) {
    try {
      await recalculateAgencyScore(agent.agencyId);
    } catch (_error) {
      // Agency score refresh is best-effort so rating UX stays responsive.
    }
  }

  return {
    review: {
      id: String(review._id),
      agentId: String(review.agentId),
      userId: String(review.userId),
      score: review.score,
      description: review.description || "",
      criteria: review.criteria || {},
      updatedAt: review.updatedAt
    },
    agentScore: score
  };
};

export const getMyAgentReview = async ({ agentId, userId }) => {
  await ensureAgent(agentId);

  const review = await AgentReview.findOne({ agentId, userId }).lean();

  return {
    review: review
      ? {
          id: String(review._id),
          agentId: String(review.agentId),
          userId: String(review.userId),
          score: review.score,
          description: review.description || "",
          criteria: review.criteria || {},
          updatedAt: review.updatedAt
        }
      : null
  };
};
export const listTopAgents = async ({ limit = 10 } = {}) => {
  const agents = await User.find({ role: { $in: AGENT_ROLES }, status: "active" })
    .select("firstName lastName email avatar role agencyId score scoreDetails")
    .populate("agencyId", "name")
    .sort({ score: -1, updatedAt: -1 })
    .limit(limit)
    .lean();

  return {
    items: agents.map((agent) => ({
      id: String(agent._id),
      userId: String(agent._id),
      firstName: agent.firstName || "",
      lastName: agent.lastName || "",
      email: agent.email || "",
      avatar: agent.avatar || null,
      role: agent.role,
      agencyId: agent.agencyId?._id ? String(agent.agencyId._id) : agent.agencyId || null,
      agencyName: agent.agencyId?.name || null,
      score: agent.score || 0,
      scoreDetails: agent.scoreDetails || null
    }))
  };
};

const scoreAgencyAgents = async (agencyId) => {
  const members = await AgencyMember.find({ agencyId, status: "active", role: { $ne: "owner" } }).select("userId").lean();
  const memberIds = members.map((member) => member.userId).filter(Boolean);
  const agents = await User.find({
    _id: { $in: memberIds },
    role: { $in: AGENT_ROLES },
    status: "active"
  }).select("score").lean();
  const recommendations = [];

  if (!agents.length) {
    return {
      score: 35,
      agentsCount: 0,
      recommendations: ["Ajoutez des agents actifs rattaches a l'agence pour renforcer son score."]
    };
  }

  const score = agents.reduce((sum, agent) => sum + numeric(agent.score), 0) / agents.length;
  if (score < 60) recommendations.push("Accompagnez les agents avec les scores faibles pour faire progresser l'agence.");

  return { score, agentsCount: agents.length, recommendations };
};

const scoreAgencyProperties = async (agencyId) => {
  const properties = await Property.find({ agencyId }).select("score status publicationStatus").lean();
  const recommendations = [];

  if (!properties.length) {
    return {
      score: 35,
      managedPropertiesCount: 0,
      recommendations: ["Ajoutez des biens geres par l'agence pour etablir un score fiable."]
    };
  }

  const averageScore = properties.reduce((sum, property) => sum + numeric(property.score), 0) / properties.length;
  const activeCount = properties.filter((property) => ACTIVE_PROPERTY_STATUSES.includes(property.status)).length;
  const score = averageScore * 0.6 + Math.min(25, properties.length * 3) + (activeCount / properties.length) * 15;

  if (averageScore < 60) recommendations.push("Ameliorez les annonces de l'agence: prix, photos et localisation.");
  if (!activeCount) recommendations.push("Publiez ou reactivez des biens pour augmenter la visibilite de l'agence.");

  return { score, managedPropertiesCount: properties.length, recommendations };
};

const scoreAgencyClosedDeals = async (agencyId) => {
  const [propertiesCount, closedProperties, closedBookings, closedContracts] = await Promise.all([
    Property.countDocuments({ agencyId }),
    Property.countDocuments({ agencyId, status: { $in: CLOSED_PROPERTY_STATUSES } }),
    Booking.countDocuments({ agencyId, status: { $in: CLOSED_BOOKING_STATUSES } }),
    ManagementContract.countDocuments({ agencyId, status: { $in: CLOSED_CONTRACT_STATUSES } })
  ]);
  const closedDeals = closedProperties + closedBookings + closedContracts;
  const recommendations = [];

  if (!closedDeals) {
    return {
      score: 35,
      closedDealsCount: 0,
      recommendations: ["Augmentez les locations, ventes, reservations confirmees ou contrats conclus."]
    };
  }

  const conversionBase = Math.max(propertiesCount, closedDeals);
  const conversionScore = conversionBase ? (closedDeals / conversionBase) * 30 : 0;
  const volumeScore = Math.min(70, closedDeals * 12);
  const score = conversionScore + volumeScore;

  if (score < 60) recommendations.push("Concentrez le suivi sur les biens proches de la conclusion.");

  return { score, closedDealsCount: closedDeals, recommendations };
};

export const calculateAgencyScore = async (agencyInput) => {
  const agency = toPlainObject(agencyInput);
  const agencyId = getEntityId(agency);
  const [agents, managedProperties, closedDeals] = await Promise.all([
    scoreAgencyAgents(agencyId),
    scoreAgencyProperties(agencyId),
    scoreAgencyClosedDeals(agencyId)
  ]);

  const agentsScore = roundScore(agents.score);
  const managedPropertiesScore = roundScore(managedProperties.score);
  const closedDealsScore = roundScore(closedDeals.score);
  const score = roundScore(
    agentsScore * 0.4
    + managedPropertiesScore * 0.3
    + closedDealsScore * 0.3
  );

  return {
    score,
    scoreDetails: makeScoreDetails({
      agentsScore,
      managedPropertiesScore,
      closedDealsScore,
      recommendations: [
        ...agents.recommendations,
        ...managedProperties.recommendations,
        ...closedDeals.recommendations
      ]
    })
  };
};

export const recalculateAgencyScore = async (agencyId) => {
  const agency = await Agency.findById(agencyId);
  if (!agency) throw new AppError("Agency not found", StatusCodes.NOT_FOUND);

  const calculated = await calculateAgencyScore(agency);
  agency.score = calculated.score;
  agency.scoreDetails = calculated.scoreDetails;
  await agency.save();

  return {
    agencyId: String(agency._id),
    globalScore: agency.score,
    score: agency.score,
    scoreDetails: agency.scoreDetails
  };
};

export const recalculateAllAgencyScores = async () => {
  const agencies = await Agency.find({}).select("_id").lean();
  let updated = 0;

  for (const agency of agencies) {
    await recalculateAgencyScore(agency._id);
    updated += 1;
  }

  return { updated };
};

export const getAgencyScore = async (agencyId) => {
  const agency = await Agency.findById(agencyId).select("score scoreDetails").lean();
  if (!agency) throw new AppError("Agency not found", StatusCodes.NOT_FOUND);

  if (!agency.scoreDetails?.calculatedAt) {
    return recalculateAgencyScore(agencyId);
  }

  return {
    agencyId: String(agency._id),
    globalScore: agency.score || 0,
    score: agency.score || 0,
    scoreDetails: agency.scoreDetails || null
  };
};

export const listTopAgencies = async ({ limit = 10 } = {}) => {
  const agencies = await Agency.find({ status: "active" })
    .select("name logo coverImage description address contactEmail contactPhone ratingAverage status score scoreDetails")
    .sort({ score: -1, ratingAverage: -1, updatedAt: -1 })
    .limit(limit)
    .lean();

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
      ratingAverage: agency.ratingAverage || 0,
      status: agency.status,
      score: agency.score || 0,
      scoreDetails: agency.scoreDetails || null
    }))
  };
};


