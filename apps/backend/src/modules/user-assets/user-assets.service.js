import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { createNotifications } from "../notifications/notifications.service.js";
import { ManagementContract } from "../contracts/management-contract.model.js";
import { OwnerMaintenanceTicket } from "../owner/models/owner-maintenance-ticket.model.js";
import { OwnerRentPayment } from "../owner/models/owner-rent-payment.model.js";
import { OwnerTenant } from "../owner/models/owner-tenant.model.js";
import { Property } from "../properties/property.model.js";
import { UserPropertyFeedback } from "./models/user-property-feedback.model.js";

const ACTIVE_CONTRACT_STATUSES = ["signed", "accepted", "active"];

const formatDate = (value) => (value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "-");
const formatMoney = (value, currency = "USD") => `${Number(value || 0).toLocaleString("fr-FR")} ${String(currency || "USD").toUpperCase()}`;
const toId = (value) => (value?._id ? String(value._id) : value ? String(value) : null);

const mapUser = (user) => user
  ? {
      id: toId(user),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      fullName: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "",
      email: user.email || "",
      phone: user.phone || "",
      avatar: user.avatar || null
    }
  : null;

const mapProperty = (property) => ({
  id: toId(property),
  title: property.title || "",
  slug: property.slug || "",
  description: property.description || "",
  type: property.type || "",
  purpose: property.purpose || "",
  status: property.status || "",
  price: Number(property.price || 0),
  currency: property.currency || "USD",
  area: Number(property.area || 0),
  rooms: Number(property.rooms || 0),
  bedrooms: Number(property.bedrooms || 0),
  bathrooms: Number(property.bathrooms || 0),
  features: property.features || [],
  address: property.address || "",
  location: property.location || null,
  coverImage: property.coverImage || null,
  media: property.media || [],
  score: Number(property.score || 0),
  scoreDetails: property.scoreDetails || {},
  agent: mapUser(property.agentId),
  owner: mapUser(property.ownerUserId)
});

const mapContract = (contract) => contract
  ? {
      id: toId(contract),
      reference: contract.reference || "",
      contractType: contract.contractType || "",
      status: contract.status || "",
      startDate: contract.startDate || null,
      endDate: contract.endDate || null,
      startDateLabel: formatDate(contract.startDate),
      endDateLabel: formatDate(contract.endDate),
      rentAmount: Number(contract.financial?.rentAmount || 0),
      charges: Number(contract.financial?.charges || 0),
      deposit: Number(contract.financial?.deposit || 0),
      currency: contract.financial?.currency || "USD",
      paymentFrequency: contract.financial?.paymentFrequency || "monthly",
      paymentStatus: contract.paymentTracking?.status || "",
      nextPaymentDate: contract.paymentTracking?.nextPaymentDate || null,
      documentUrl: contract.documents?.contractFile || "",
      attachments: contract.documents?.attachments || []
    }
  : null;

const mapPayment = (payment) => ({
  id: toId(payment),
  dueDate: payment.dueDate || null,
  dueDateLabel: formatDate(payment.dueDate),
  amount: Number(payment.amount || 0),
  amountLabel: formatMoney(payment.amount, payment.currency || "USD"),
  currency: payment.currency || "USD",
  status: payment.status || "pending",
  receiptNumber: payment.receiptNumber || "",
  canDownloadReceipt: Boolean(payment.receiptNumber || payment.status === "paid")
});

const mapFeedback = (feedback) => ({
  id: toId(feedback),
  subject: feedback.subject || "",
  message: feedback.message || "",
  rating: Number(feedback.rating || 0),
  status: feedback.status || "new",
  createdAt: feedback.createdAt,
  createdAtLabel: formatDate(feedback.createdAt),
  user: mapUser(feedback.userId)
});

const mapMaintenanceTicket = (ticket) => ({
  id: toId(ticket),
  title: ticket.title || "",
  description: ticket.description || "",
  priority: ticket.priority || "medium",
  status: ticket.status || "planned",
  createdAt: ticket.createdAt,
  createdAtLabel: formatDate(ticket.createdAt)
});

const createNotificationPayload = ({ userId, type, title, body, data = {} }) => ({
  userId,
  type,
  title,
  body,
  channel: "in_app",
  data
});

const buildAssetFromTenant = async (tenant) => {
  const property = tenant.managedPropertyId;
  const contract = tenant.managementContractId || null;

  return {
    id: toId(tenant),
    assetType: "rented",
    relation: "rented",
    title: property?.title || tenant.property || "Bien loue",
    subtitle: property?.address || tenant.adresse || "",
    status: contract?.status || "active",
    property: property ? mapProperty(property) : null,
    contract: mapContract(contract),
    owner: mapUser(property?.ownerUserId),
    agent: mapUser(property?.agentId),
    tenant: {
      id: toId(tenant),
      fullName: tenant.fullName,
      email: tenant.email,
      phone: tenant.phone
    }
  };
};

const buildAssetFromPurchasedProperty = ({ property, contract = null }) => ({
  id: toId(property),
  assetType: "purchased",
  relation: "purchased",
  title: property.title,
  subtitle: property.address || "",
  status: property.status || "sold",
  property: mapProperty(property),
  contract: mapContract(contract || property.managementContractId),
  previousOwner: mapUser(property.ownerUserId),
  agent: mapUser(property.agentId)
});

const getRentedTenant = async ({ userId, tenantId }) =>
  OwnerTenant.findOne({ _id: tenantId, linkedUserId: userId })
    .populate({
      path: "managedPropertyId",
      select: "title slug description type purpose status price currency area rooms bedrooms bathrooms features address location coverImage media score scoreDetails ownerUserId agentId",
      populate: [
        { path: "ownerUserId", select: "firstName lastName email phone avatar" },
        { path: "agentId", select: "firstName lastName email phone avatar" }
      ]
    })
    .populate("managementContractId")
    .lean();

const getPurchasedProperty = async ({ userId, propertyId }) => {
  const property = await Property.findOne({ _id: propertyId })
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .populate("agentId", "firstName lastName email phone avatar")
    .populate("managementContractId")
    .lean();

  if (!property) {
    return null;
  }

  if (String(property.reservedByUserId || "") === String(userId) && property.status === "sold") {
    return property;
  }

  const contract = await ManagementContract.findOne({
    propertyId,
    status: { $in: ACTIVE_CONTRACT_STATUSES },
    "tenants.tenantId": userId
  }).lean();

  return contract ? { ...property, managementContractId: contract } : null;
};

const resolveAssetAccess = async ({ userId, assetType, assetId }) => {
  if (assetType === "rented") {
    const tenant = await getRentedTenant({ userId, tenantId: assetId });
    if (!tenant?.managedPropertyId) {
      throw new AppError("Bien loue introuvable", StatusCodes.NOT_FOUND);
    }

    return {
      assetType,
      tenant,
      property: tenant.managedPropertyId,
      contract: tenant.managementContractId || null,
      ownerId: tenant.managedPropertyId.ownerUserId?._id || tenant.managedPropertyId.ownerUserId,
      agentId: tenant.managedPropertyId.agentId?._id || tenant.managedPropertyId.agentId
    };
  }

  const property = await getPurchasedProperty({ userId, propertyId: assetId });
  if (!property) {
    throw new AppError("Bien achete introuvable", StatusCodes.NOT_FOUND);
  }

  return {
    assetType,
    tenant: null,
    property,
    contract: property.managementContractId || null,
    ownerId: property.ownerUserId?._id || property.ownerUserId,
    agentId: property.agentId?._id || property.agentId
  };
};

export const listUserAssets = async ({ userId }) => {
  const rentedTenants = await OwnerTenant.find({ linkedUserId: userId })
    .populate({
      path: "managedPropertyId",
      select: "title slug description type purpose status price currency area rooms bedrooms bathrooms features address location coverImage media score scoreDetails ownerUserId agentId",
      populate: [
        { path: "ownerUserId", select: "firstName lastName email phone avatar" },
        { path: "agentId", select: "firstName lastName email phone avatar" }
      ]
    })
    .populate("managementContractId")
    .sort({ updatedAt: -1 })
    .lean();

  const directPurchasedProperties = await Property.find({ reservedByUserId: userId, status: "sold" })
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .populate("agentId", "firstName lastName email phone avatar")
    .populate("managementContractId")
    .sort({ updatedAt: -1 })
    .lean();

  const saleContracts = await ManagementContract.find({
    "tenants.tenantId": userId,
    status: { $in: ACTIVE_CONTRACT_STATUSES },
    propertyId: { $ne: null }
  })
    .populate({
      path: "propertyId",
      select: "title slug description type purpose status price currency area rooms bedrooms bathrooms features address location coverImage media score scoreDetails ownerUserId agentId",
      populate: [
        { path: "ownerUserId", select: "firstName lastName email phone avatar" },
        { path: "agentId", select: "firstName lastName email phone avatar" }
      ]
    })
    .lean();

  const purchasedById = new Map();
  directPurchasedProperties.forEach((property) => purchasedById.set(toId(property), buildAssetFromPurchasedProperty({ property })));
  saleContracts.forEach((contract) => {
    if (contract.propertyId && !purchasedById.has(toId(contract.propertyId))) {
      purchasedById.set(toId(contract.propertyId), buildAssetFromPurchasedProperty({ property: contract.propertyId, contract }));
    }
  });

  const rented = [];
  for (const tenant of rentedTenants) {
    if (tenant.managedPropertyId) {
      rented.push(await buildAssetFromTenant(tenant));
    }
  }

  const purchased = [...purchasedById.values()];

  return {
    rented,
    purchased,
    summary: {
      rentedCount: rented.length,
      purchasedCount: purchased.length,
      total: rented.length + purchased.length
    }
  };
};

export const getUserAssetDetail = async ({ userId, assetType, assetId }) => {
  const access = await resolveAssetAccess({ userId, assetType, assetId });
  const [payments, maintenance, feedbacks, neighbors] = await Promise.all([
    access.tenant
      ? OwnerRentPayment.find({ tenantId: access.tenant._id }).sort({ dueDate: -1 }).lean()
      : Promise.resolve([]),
    OwnerMaintenanceTicket.find({ managedPropertyId: access.property._id }).sort({ createdAt: -1 }).limit(8).lean(),
    UserPropertyFeedback.find({ propertyId: access.property._id, userId })
      .populate("userId", "firstName lastName email avatar")
      .sort({ createdAt: -1 })
      .lean(),
    access.tenant
      ? OwnerTenant.find({ managedPropertyId: access.property._id, _id: { $ne: access.tenant._id } })
          .populate("linkedUserId", "firstName lastName email phone avatar")
          .sort({ fullName: 1 })
          .lean()
      : Promise.resolve([])
  ]);

  const asset = access.assetType === "rented"
    ? await buildAssetFromTenant(access.tenant)
    : buildAssetFromPurchasedProperty({ property: access.property, contract: access.contract });

  return {
    ...asset,
    payments: payments.map(mapPayment),
    maintenance: maintenance.map(mapMaintenanceTicket),
    feedbacks: feedbacks.map(mapFeedback),
    neighbors: neighbors.map((tenant) => ({
      id: toId(tenant),
      firstName: tenant.linkedUserId?.firstName || tenant.firstName || "",
      lastName: tenant.linkedUserId?.lastName || tenant.lastName || "",
      fullName: tenant.fullName || [tenant.firstName, tenant.lastName].filter(Boolean).join(" ").trim(),
      email: tenant.linkedUserId?.email || tenant.email || "",
      phone: tenant.linkedUserId?.phone || tenant.phone || "",
      contact: tenant.contact || tenant.phone || tenant.email || "",
      avatar: tenant.linkedUserId?.avatar || null
    }))
  };
};

export const releaseUserRentedAsset = async ({ userId, assetId }) => {
  const access = await resolveAssetAccess({ userId, assetType: "rented", assetId });
  const property = await Property.findById(access.property._id);
  const contract = access.contract?._id ? await ManagementContract.findById(access.contract._id) : null;

  if (contract) {
    contract.status = "terminated";
    contract.paymentTracking = {
      ...contract.paymentTracking,
      status: "terminated"
    };
    await contract.save();
  }

  if (property) {
    property.status = "published";
    property.reservedByUserId = null;
    property.reservedAt = null;
    await property.save();
  }

  await OwnerTenant.deleteOne({ _id: access.tenant._id });

  await createNotifications([
    createNotificationPayload({
      userId: access.ownerId,
      type: "user.property.released",
      title: "Bien libere par le locataire",
      body: `${access.tenant.fullName} a libere ${access.property.title}. Le contrat associe a ete marque comme termine.`,
      data: {
        propertyId: toId(access.property),
        tenantId: toId(access.tenant),
        contractId: toId(contract),
        actorId: userId
      }
    }),
    createNotificationPayload({
      userId,
      type: "user.property.release.confirmed",
      title: "Bien libere",
      body: `Votre demande de liberation pour ${access.property.title} a ete enregistree.`,
      data: {
        propertyId: toId(access.property),
        contractId: toId(contract)
      }
    })
  ]);

  return { success: true, releasedPropertyId: toId(access.property), terminatedContractId: toId(contract) };
};

export const payUserRent = async ({ userId, assetId, paymentId }) => {
  await resolveAssetAccess({ userId, assetType: "rented", assetId });
  const payment = await OwnerRentPayment.findById(paymentId);

  if (!payment) {
    throw new AppError("Paiement introuvable", StatusCodes.NOT_FOUND);
  }

  const tenant = await OwnerTenant.findOne({ _id: payment.tenantId, linkedUserId: userId }).lean();
  if (!tenant) {
    throw new AppError("Paiement non autorise", StatusCodes.FORBIDDEN);
  }

  payment.status = "paid";
  payment.receiptNumber = payment.receiptNumber || `Q-${new Date().getFullYear()}-${String(payment._id).slice(-6).toUpperCase()}`;
  await payment.save();

  await createNotifications([
    createNotificationPayload({
      userId: payment.ownerId,
      type: "user.rent.paid",
      title: "Loyer paye",
      body: `${tenant.fullName} a marque un loyer comme paye.`,
      data: { paymentId: toId(payment), tenantId: toId(tenant), actorId: userId }
    }),
    createNotificationPayload({
      userId,
      type: "user.receipt.generated",
      title: "Quittance disponible",
      body: `La quittance ${payment.receiptNumber} est disponible.`,
      data: { paymentId: toId(payment), receiptNumber: payment.receiptNumber }
    })
  ]);

  return mapPayment(payment);
};

export const getUserRentReceipt = async ({ userId, assetId, paymentId }) => {
  await resolveAssetAccess({ userId, assetType: "rented", assetId });
  const payment = await OwnerRentPayment.findById(paymentId)
    .populate("tenantId", "fullName email")
    .lean();

  if (!payment) {
    throw new AppError("Quittance introuvable", StatusCodes.NOT_FOUND);
  }

  const tenant = await OwnerTenant.findOne({ _id: payment.tenantId, linkedUserId: userId }).lean();
  if (!tenant) {
    throw new AppError("Quittance non autorisee", StatusCodes.FORBIDDEN);
  }

  return {
    receiptNumber: payment.receiptNumber || `Q-${String(payment._id).slice(-6).toUpperCase()}`,
    tenant: payment.tenantId?.fullName || tenant.fullName,
    amount: formatMoney(payment.amount, payment.currency || "USD"),
    dueDate: formatDate(payment.dueDate),
    status: payment.status,
    content: [
      `Quittance: ${payment.receiptNumber || `Q-${String(payment._id).slice(-6).toUpperCase()}`}`,
      `Locataire: ${payment.tenantId?.fullName || tenant.fullName}`,
      `Montant: ${formatMoney(payment.amount, payment.currency || "USD")}`,
      `Echeance: ${formatDate(payment.dueDate)}`,
      `Statut: ${payment.status}`
    ].join("\n")
  };
};

export const reportUserAssetIssue = async ({ userId, assetType, assetId, payload }) => {
  const access = await resolveAssetAccess({ userId, assetType, assetId });
  const ticket = await OwnerMaintenanceTicket.create({
    ownerId: access.ownerId,
    managedPropertyId: access.property._id,
    propertyLabel: access.property.title,
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
    status: "planned",
    assignee: access.agentId ? "Agent responsable" : "",
    maintenanceAmount: 0,
    currency: access.property.currency || "USD",
    lastUpdateAt: new Date()
  });

  await createNotifications([
    createNotificationPayload({
      userId: access.ownerId,
      type: "user.maintenance.reported",
      title: "Probleme signale",
      body: `Un probleme a ete signale sur ${access.property.title}.`,
      data: { ticketId: toId(ticket), propertyId: toId(access.property), actorId: userId }
    }),
    access.agentId && createNotificationPayload({
      userId: access.agentId,
      type: "user.maintenance.reported.agent",
      title: "Probleme locataire",
      body: `Un probleme a ete signale sur ${access.property.title}.`,
      data: { ticketId: toId(ticket), propertyId: toId(access.property), actorId: userId }
    })
  ]);

  return mapMaintenanceTicket(ticket);
};

export const createUserAssetFeedback = async ({ userId, assetType, assetId, payload }) => {
  const access = await resolveAssetAccess({ userId, assetType, assetId });
  const feedback = await UserPropertyFeedback.create({
    ownerId: access.ownerId,
    userId,
    propertyId: access.property._id,
    tenantId: access.tenant?._id || null,
    managementContractId: access.contract?._id || null,
    agentId: access.agentId || null,
    subject: payload.subject || "",
    message: payload.message,
    rating: payload.rating || 0
  });

  await createNotifications([
    createNotificationPayload({
      userId: access.ownerId,
      type: "user.property.feedback",
      title: "Feedback recu",
      body: `Un feedback a ete envoye pour ${access.property.title}.`,
      data: { feedbackId: toId(feedback), propertyId: toId(access.property), actorId: userId }
    }),
    access.agentId && createNotificationPayload({
      userId: access.agentId,
      type: "user.property.feedback.agent",
      title: "Feedback bien",
      body: `Un feedback a ete envoye pour ${access.property.title}.`,
      data: { feedbackId: toId(feedback), propertyId: toId(access.property), actorId: userId }
    })
  ]);

  return mapFeedback(feedback);
};

export const requestUserAssetSaleContract = async ({ userId, assetId }) => {
  const access = await resolveAssetAccess({ userId, assetType: "purchased", assetId });

  await createNotifications([
    access.agentId && createNotificationPayload({
      userId: access.agentId,
      type: "user.property.sale_requested",
      title: "Demande de mise en vente",
      body: `Le proprietaire acheteur souhaite vendre ${access.property.title} et l'associer a un contrat.`,
      data: { propertyId: toId(access.property), actorId: userId }
    }),
    access.ownerId && createNotificationPayload({
      userId: access.ownerId,
      type: "user.property.sale_requested.previous_owner",
      title: "Bien remis en vente",
      body: `${access.property.title} fait l'objet d'une demande de mise en vente.`,
      data: { propertyId: toId(access.property), actorId: userId }
    })
  ]);

  return {
    success: true,
    propertyId: toId(access.property),
    message: "Demande de vente envoyee. Un contrat de vente pourra etre associe par l'agent responsable."
  };
};
