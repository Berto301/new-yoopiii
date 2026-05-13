import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { createNotifications } from "../notifications/notifications.service.js";
import { Property } from "../properties/property.model.js";
import { Notification } from "../notifications/notification.model.js";
import { User } from "../users/user.model.js";
import { ManagementContract } from "../contracts/management-contract.model.js";
import { OwnerContract } from "./models/owner-contract.model.js";
import { OwnerMaintenanceTicket } from "./models/owner-maintenance-ticket.model.js";
import { OwnerProperty } from "./models/owner-property.model.js";
import { OwnerRentPayment } from "./models/owner-rent-payment.model.js";
import { OwnerTenant } from "./models/owner-tenant.model.js";
import { UserPropertyFeedback } from "../user-assets/models/user-property-feedback.model.js";

const OWNER_NOTIFICATION_SOURCE = "owner_workspace_seed";

const seedOwnerWorkspace = async (_ownerId) => {
  // New owner accounts must stay clean. Historical demo rows remain readable,
  // but the workspace no longer creates fake properties, tenants, rents or alerts.
};

const formatDate = (value) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
const formatCurrency = (value, currency = "USD") => `${Number(value || 0).toLocaleString("fr-FR")} ${String(currency || "USD").toUpperCase()}`;

const resolveOwnerCurrency = async (ownerId) => {
  const owner = await User.findById(ownerId).select("preferences.currency").lean();

  return owner?.preferences?.currency || "USD";
};

const propertyStatusLabelMap = {
  loue: "Loue",
  libre: "Libre",
  en_travaux: "En travaux"
};

const contractStatusLabelMap = {
  active: "Actif",
  draft: "Brouillon",
  archived: "Archive"
};

const partnerTypeLabelMap = {
  agency: "Agence",
  independent_agent: "Agent independant"
};

const rentStatusLabelMap = {
  paid: "Paye",
  approved: "Approuve",
  late: "En retard",
  pending: "En attente",
  pending_approval: "En attente d'approbation",
  rejected: "Rejete",
  cancelled: "Annule"
};

const paymentMethodLabelMap = {
  cash: "Especes",
  bank_transfer: "Virement",
  mobile_money: "Mobile money",
  card: "Carte bancaire",
  check: "Cheque",
  other: "Autre",
  "": "-"
};

const APPROVED_PAYMENT_STATUSES = new Set(["approved", "paid"]);
const EDITABLE_PAYMENT_STATUSES = new Set(["pending", "pending_approval", "late", "rejected"]);
const RECEIPT_PAYMENT_STATUSES = new Set(["approved", "paid"]);

const maintenanceStatusLabelMap = {
  planned: "Planifie",
  in_progress: "En cours",
  closed: "Cloture"
};

const priorityLabelMap = {
  high: "Haute",
  medium: "Moyenne",
  low: "Basse"
};

const tenantGenderLabelMap = {
  homme: "Homme",
  femme: "Femme",
  autre: "Autre"
};

const resolveMaintenancePropertyLabel = (ticket) =>
  ticket.managedPropertyId?.title ||
  ticket.propertyId?.title ||
  ticket.propertyLabel ||
  "Bien non renseigne";

const mapMaintenanceTicket = (ticket) => ({
  id: String(ticket._id),
  title: ticket.title,
  titleSelections: String(ticket.title || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  description: ticket.description || "",
  property: resolveMaintenancePropertyLabel(ticket),
  propertyLabel: ticket.propertyLabel || resolveMaintenancePropertyLabel(ticket),
  managedPropertyId: ticket.managedPropertyId?._id ? String(ticket.managedPropertyId._id) : ticket.managedPropertyId ? String(ticket.managedPropertyId) : null,
  ownerPropertyId: ticket.propertyId?._id ? String(ticket.propertyId._id) : ticket.propertyId ? String(ticket.propertyId) : null,
  priority: priorityLabelMap[ticket.priority] || ticket.priority,
  priorityValue: ticket.priority,
  assignee: ticket.assignee || "-",
  status: maintenanceStatusLabelMap[ticket.status] || ticket.status,
  statusValue: ticket.status,
  maintenanceAmount: Number(ticket.maintenanceAmount || 0),
  currency: ticket.currency || "USD",
  lastUpdate: formatDate(ticket.lastUpdateAt || ticket.updatedAt),
  lastUpdateAt: ticket.lastUpdateAt || ticket.updatedAt,
  updatedAt: ticket.updatedAt
});

const resolveTenantPropertyLabel = (tenant) =>
  tenant.managedPropertyId?.title ||
  tenant.propertyId?.title ||
  "Bien non renseigne";

const resolveTenantContractLabel = (tenant) =>
  tenant.managementContractId?.reference ||
  tenant.managementContractId?.title ||
  tenant.contractId?.title ||
  "Aucun contrat";

const buildTenantIdentity = (tenant) => tenant.cin || tenant.identityDocument || "-";

const mapOwnerTenant = (tenant) => ({
  id: String(tenant._id),
  linkedUserId: tenant.linkedUserId?._id ? String(tenant.linkedUserId._id) : tenant.linkedUserId ? String(tenant.linkedUserId) : null,
  managedPropertyId: tenant.managedPropertyId?._id ? String(tenant.managedPropertyId._id) : tenant.managedPropertyId ? String(tenant.managedPropertyId) : null,
  managementContractId:
    tenant.managementContractId?._id ? String(tenant.managementContractId._id) : tenant.managementContractId ? String(tenant.managementContractId) : null,
  firstName: tenant.firstName || "",
  lastName: tenant.lastName || "",
  fullName: tenant.fullName,
  email: tenant.email || "",
  phone: tenant.phone || "",
  cin: tenant.cin || "",
  adresse: tenant.adresse || "",
  sexe: tenant.sexe || "",
  sexeLabel: tenantGenderLabelMap[tenant.sexe] || "Non renseigne",
  contact: tenant.contact || tenant.phone || tenant.email || "-",
  identity: buildTenantIdentity(tenant),
  documents: tenant.documentsCount || 0,
  paymentHistory: tenant.paymentHistoryLabel || "-",
  contract: resolveTenantContractLabel(tenant),
  property: resolveTenantPropertyLabel(tenant),
  source: tenant.source || "manual"
});

const buildOwnerTenantDraftFromUser = ({ user, managedPropertyId, managementContractId, source }) => ({
  linkedUserId: user._id,
  managedPropertyId,
  managementContractId: managementContractId || null,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  fullName: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "Locataire",
  email: user.email || "",
  phone: user.phone || "",
  cin: user.cin || "",
  adresse: user.adresse || "",
  sexe: user.sexe || "",
  contact: user.phone || user.email || "",
  identityDocument: user.cin || "",
  source
});

const ensureManagedPropertyForOwnerTenant = async ({ ownerId, managedPropertyId }) => {
  const property = await Property.findOne({ _id: managedPropertyId, ownerUserId: ownerId })
    .select("title ownerUserId managementContractId purpose")
    .lean();

  if (!property) {
    throw new AppError("Bien introuvable pour ce proprietaire", StatusCodes.NOT_FOUND);
  }

  if (property.purpose !== "rent") {
    throw new AppError("Seuls les biens en location peuvent avoir des locataires", StatusCodes.BAD_REQUEST);
  }

  return property;
};

const ensureLinkedUser = async (linkedUserId) => {
  const user = await User.findById(linkedUserId)
    .select("firstName lastName email phone cin adresse sexe status")
    .lean();

  if (!user || user.status !== "active") {
    throw new AppError("Utilisateur introuvable", StatusCodes.NOT_FOUND);
  }

  return user;
};

const upsertOwnerTenantFromClosedWon = async ({ ownerId, managedPropertyId, userId }) => {
  const [property, user] = await Promise.all([
    Property.findOne({ _id: managedPropertyId, ownerUserId: ownerId }).select("managementContractId purpose").lean(),
    User.findById(userId).select("firstName lastName email phone cin adresse sexe").lean()
  ]);

  if (!property || property.purpose !== "rent" || !user) {
    return null;
  }

  const tenantDraft = buildOwnerTenantDraftFromUser({
    user,
    managedPropertyId,
    managementContractId: property.managementContractId || null,
    source: "booking_closed_won"
  });

  const tenant = await OwnerTenant.findOneAndUpdate(
    {
      ownerId,
      managedPropertyId,
      linkedUserId: user._id
    },
    {
      $set: {
        ...tenantDraft,
        ownerId
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  )
    .populate("managedPropertyId", "title")
    .populate("managementContractId", "reference title")
    .populate("linkedUserId", "firstName lastName email")
    .lean();

  return tenant ? mapOwnerTenant(tenant) : null;
};

const buildMaintenanceNotificationPayload = ({ ownerId, type, title, body, ticketId, managedPropertyId }) => ({
  userId: ownerId,
  type,
  title,
  body,
  channel: "in_app",
  data: {
    ticketId: String(ticketId),
    managedPropertyId: managedPropertyId ? String(managedPropertyId) : null
  }
});

const buildOwnerNotificationPayload = ({ userId, type, title, body, data = {} }) => ({
  userId,
  type,
  title,
  body,
  channel: "in_app",
  data
});

const mapTenantUser = (user) => user
  ? {
      id: String(user._id || user),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      fullName: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "",
      email: user.email || "",
      phone: user.phone || "",
      avatar: user.avatar || null
    }
  : null;

const resolvePaymentTenant = (payment) => payment.tenantId && typeof payment.tenantId === "object" ? payment.tenantId : null;
const resolvePaymentProperty = (payment) => {
  const tenant = resolvePaymentTenant(payment);
  return payment.managedPropertyId && typeof payment.managedPropertyId === "object"
    ? payment.managedPropertyId
    : tenant?.managedPropertyId && typeof tenant.managedPropertyId === "object"
      ? tenant.managedPropertyId
      : payment.propertyId && typeof payment.propertyId === "object"
        ? payment.propertyId
        : null;
};
const resolvePaymentContract = (payment) => {
  const tenant = resolvePaymentTenant(payment);
  return payment.managementContractId && typeof payment.managementContractId === "object"
    ? payment.managementContractId
    : tenant?.managementContractId && typeof tenant.managementContractId === "object"
      ? tenant.managementContractId
      : null;
};

const mapRentPaymentForProperty = (payment) => {
  const tenant = resolvePaymentTenant(payment);
  const property = resolvePaymentProperty(payment);
  const contract = resolvePaymentContract(payment);
  const status = payment.status || "pending";
  const currency = payment.currency || contract?.financial?.currency || property?.currency || "USD";
  const paidAmount = Number(payment.paidAmount || payment.amount || 0);
  const receiptAvailable = RECEIPT_PAYMENT_STATUSES.has(status) && Boolean(payment.receiptNumber);

  return {
    id: String(payment._id),
    tenantId: tenant?._id ? String(tenant._id) : payment.tenantId ? String(payment.tenantId) : null,
    tenantUserId: tenant?.linkedUserId?._id ? String(tenant.linkedUserId._id) : tenant?.linkedUserId ? String(tenant.linkedUserId) : null,
    tenant: tenant?.fullName || "Locataire",
    propertyId: property?._id ? String(property._id) : payment.managedPropertyId ? String(payment.managedPropertyId) : null,
    property: property?.title || "Bien non renseigne",
    propertyAddress: property?.address || "",
    contractId: contract?._id ? String(contract._id) : payment.managementContractId ? String(payment.managementContractId) : null,
    contract: contract?.reference || contract?.title || "-",
    dueDate: payment.dueDate,
    dueDateLabel: formatDate(payment.dueDate),
    amount: Number(payment.amount || 0),
    amountLabel: formatCurrency(payment.amount, currency),
    paidAmount,
    paidAmountLabel: formatCurrency(paidAmount, currency),
    payment: formatCurrency(paidAmount, currency),
    currency,
    status,
    statusLabel: rentStatusLabelMap[status] || status,
    paymentDate: payment.paymentDate || null,
    paymentDateLabel: payment.paymentDate ? formatDate(payment.paymentDate) : "-",
    paymentMethod: payment.paymentMethod || "",
    paymentMethodLabel: paymentMethodLabelMap[payment.paymentMethod || ""] || payment.paymentMethod || "-",
    paymentReference: payment.paymentReference || "",
    proofUrl: payment.proofUrl || "",
    proofName: payment.proofName || "",
    note: payment.note || "",
    receiptNumber: payment.receiptNumber || "",
    canApprove: status === "pending_approval" || status === "pending",
    canEdit: EDITABLE_PAYMENT_STATUSES.has(status),
    canDelete: !APPROVED_PAYMENT_STATUSES.has(status),
    canDownloadReceipt: receiptAvailable,
    source: payment.source || "legacy",
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
};

const mapOwnerPropertyFeedback = (feedback) => ({
  id: String(feedback._id),
  subject: feedback.subject || "",
  message: feedback.message || "",
  rating: Number(feedback.rating || 0),
  status: feedback.status || "new",
  createdAt: feedback.createdAt,
  createdAtLabel: formatDate(feedback.createdAt),
  tenantId: feedback.tenantId?._id ? String(feedback.tenantId._id) : feedback.tenantId ? String(feedback.tenantId) : null,
  user: mapTenantUser(feedback.userId)
});

const calculateTenantScore = ({ payments }) => {
  if (!payments.length) {
    return 75;
  }

  const paidCount = payments.filter((payment) => payment.status === "paid").length;
  const lateCount = payments.filter((payment) => payment.status === "late").length;
  const score = Math.round(70 + (paidCount / payments.length) * 30 - lateCount * 8);
  return Math.max(0, Math.min(100, score));
};

const ensureLateRentNotifications = async ({ ownerId, property, latePayments }) => {
  if (!latePayments.length) {
    return;
  }

  const paymentIds = latePayments.map((payment) => String(payment._id));
  const existingNotifications = await Notification.find({
    type: { $in: ["owner.rent.late", "user.rent.late"] },
    "data.paymentId": { $in: paymentIds }
  })
    .select("type userId data.paymentId")
    .lean();
  const existingKeys = new Set(
    existingNotifications.map((notification) => `${notification.type}:${String(notification.userId)}:${String(notification.data?.paymentId || "")}`)
  );
  const payloads = [];

  latePayments.forEach((payment) => {
    const paymentId = String(payment._id);
    const tenantName = payment.tenantId?.fullName || "Locataire";
    const tenantUserId = payment.tenantId?.linkedUserId?._id
      ? String(payment.tenantId.linkedUserId._id)
      : payment.tenantId?.linkedUserId
        ? String(payment.tenantId.linkedUserId)
        : null;
    const ownerKey = `owner.rent.late:${String(ownerId)}:${paymentId}`;

    if (!existingKeys.has(ownerKey)) {
      payloads.push(buildOwnerNotificationPayload({
        userId: ownerId,
        type: "owner.rent.late",
        title: "Loyer en retard",
        body: `${tenantName} a un loyer en retard pour ${property.title}.`,
        data: {
          propertyId: String(property._id),
          paymentId,
          tenantId: payment.tenantId?._id ? String(payment.tenantId._id) : String(payment.tenantId || "")
        }
      }));
    }

    if (tenantUserId && tenantUserId !== String(ownerId)) {
      const tenantKey = `user.rent.late:${tenantUserId}:${paymentId}`;

      if (!existingKeys.has(tenantKey)) {
        payloads.push(buildOwnerNotificationPayload({
          userId: tenantUserId,
          type: "user.rent.late",
          title: "Paiement en retard",
          body: `Un loyer est en retard pour ${property.title}.`,
          data: {
            propertyId: String(property._id),
            paymentId,
            ownerId: String(ownerId)
          }
        }));
      }
    }
  });

  await createNotifications(payloads);
};

const createMaintenanceNotification = async ({ ownerId, action, ticket }) => {
  const propertyLabel = resolveMaintenancePropertyLabel(ticket);
  const notificationByAction = {
    created: {
      type: "owner.maintenance.created",
      title: `Ticket cree: ${ticket.title}`,
      body: `Le ticket ${ticket.title} a ete ajoute pour ${propertyLabel}.`
    },
    updated: {
      type: "owner.maintenance.updated",
      title: `Ticket mis a jour: ${ticket.title}`,
      body: `Le ticket ${ticket.title} est maintenant ${maintenanceStatusLabelMap[ticket.status] || ticket.status} pour ${propertyLabel}.`
    },
    deleted: {
      type: "owner.maintenance.deleted",
      title: `Ticket supprime: ${ticket.title}`,
      body: `Le ticket ${ticket.title} a ete supprime pour ${propertyLabel}.`
    }
  }[action];

  if (!notificationByAction) {
    return;
  }

  await createNotifications([
    buildMaintenanceNotificationPayload({
      ownerId,
      ...notificationByAction,
      ticketId: ticket._id || ticket.id,
      managedPropertyId: ticket.managedPropertyId?._id || ticket.managedPropertyId || null
    })
  ]);
};

const ensureManagedPropertyOwnership = async ({ ownerId, managedPropertyId }) => {
  const property = await Property.findOne({ _id: managedPropertyId, ownerUserId: ownerId })
    .select("title address currency price ownerUserId managementContractId purpose status")
    .lean();

  if (!property) {
    throw new AppError("Bien introuvable pour ce proprietaire", StatusCodes.NOT_FOUND);
  }

  return property;
};

const populateRentPaymentQuery = (query) =>
  query
    .populate({
      path: "tenantId",
      select: "fullName email phone linkedUserId managedPropertyId managementContractId",
      populate: [
        { path: "linkedUserId", select: "firstName lastName email phone avatar" },
        { path: "managedPropertyId", select: "title address currency price coverImage" },
        { path: "managementContractId", select: "reference status financial paymentTracking" }
      ]
    })
    .populate("managedPropertyId", "title address currency price coverImage")
    .populate("managementContractId", "reference status financial paymentTracking");

const loadOwnerPayment = async ({ ownerId, paymentId }) => {
  const payment = await populateRentPaymentQuery(OwnerRentPayment.findOne({ _id: paymentId, ownerId })).lean();

  if (!payment) {
    throw new AppError("Paiement introuvable", StatusCodes.NOT_FOUND);
  }

  return payment;
};

const resolveOwnerPaymentContext = async ({ ownerId, payload }) => {
  const property = await ensureManagedPropertyOwnership({
    ownerId,
    managedPropertyId: payload.managedPropertyId
  });
  const tenant = await OwnerTenant.findOne({
    _id: payload.tenantId,
    ownerId,
    managedPropertyId: property._id
  })
    .populate("linkedUserId", "firstName lastName email phone")
    .populate("managementContractId", "reference status financial paymentTracking")
    .lean();

  if (!tenant) {
    throw new AppError("Locataire introuvable pour ce bien", StatusCodes.NOT_FOUND);
  }

  const managementContractId = payload.managementContractId || tenant.managementContractId?._id || tenant.managementContractId || property.managementContractId || null;
  const contract = managementContractId
    ? await ManagementContract.findOne({ _id: managementContractId, ownerUserId: ownerId })
      .select("reference status financial paymentTracking propertyId")
      .lean()
    : null;

  return { property, tenant, contract, managementContractId };
};

const buildPaymentDraft = ({ ownerId, actorId, source, payload, context }) => {
  const { property, tenant, contract, managementContractId } = context;
  const amount = Number(payload.amount ?? contract?.financial?.rentAmount ?? property.price ?? 0);
  const currency = String(payload.currency || contract?.financial?.currency || property.currency || "USD").toUpperCase();
  const paidAmount = Number(payload.paidAmount ?? amount);

  return {
    ownerId,
    managedPropertyId: property._id,
    tenantId: tenant._id,
    managementContractId: managementContractId || null,
    dueDate: payload.dueDate,
    amount,
    paidAmount,
    currency,
    status: payload.status || "pending_approval",
    paymentDate: payload.paymentDate || null,
    paymentMethod: payload.paymentMethod || "",
    paymentReference: payload.paymentReference || "",
    proofUrl: payload.proofUrl || "",
    proofName: payload.proofName || "",
    note: payload.note || "",
    createdByUserId: actorId || null,
    source
  };
};

const notifyPaymentCreated = async ({ payment, tenant, property, actorId, source }) => {
  const tenantUserId = tenant.linkedUserId?._id || tenant.linkedUserId || null;
  const payloads = [];

  if (source === "tenant") {
    payloads.push(buildOwnerNotificationPayload({
      userId: payment.ownerId,
      type: "rent.payment.created_by_tenant",
      title: "Paiement ajoute par le locataire",
      body: `${tenant.fullName || "Un locataire"} a ajoute un paiement pour ${property.title}.`,
      data: {
        paymentId: String(payment._id),
        propertyId: String(property._id),
        tenantId: String(tenant._id),
        actorId
      }
    }));
  } else if (tenantUserId) {
    payloads.push(buildOwnerNotificationPayload({
      userId: tenantUserId,
      type: "rent.payment.created_by_owner",
      title: "Paiement ajoute",
      body: `Un paiement a ete ajoute pour ${property.title}.`,
      data: {
        paymentId: String(payment._id),
        propertyId: String(property._id),
        tenantId: String(tenant._id),
        actorId
      }
    }));
  }

  await createNotifications(payloads);
};

const syncContractAfterApprovedPayment = async (payment) => {
  if (!payment.managementContractId) {
    return;
  }

  const nextPaymentDate = payment.dueDate ? new Date(payment.dueDate) : null;
  if (nextPaymentDate) {
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  }

  await ManagementContract.updateOne(
    { _id: payment.managementContractId, ownerUserId: payment.ownerId },
    {
      $set: {
        "paymentTracking.status": "paid",
        "paymentTracking.lastPaymentDate": payment.paymentDate || new Date(),
        ...(nextPaymentDate ? { "paymentTracking.nextPaymentDate": nextPaymentDate } : {})
      }
    }
  );
};

export const getOwnerRentPayments = async ({ ownerId, filters = {} }) => {
  const query = { ownerId };

  if (filters.propertyId) {
    query.managedPropertyId = filters.propertyId;
  }

  if (filters.tenantId) {
    query.tenantId = filters.tenantId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const payments = await populateRentPaymentQuery(
    OwnerRentPayment.find(query).sort({ dueDate: -1, createdAt: -1 })
  ).lean();

  return payments.map(mapRentPaymentForProperty);
};

export const createOwnerRentPayment = async ({ ownerId, actorId, payload, source = "owner" }) => {
  await seedOwnerWorkspace(ownerId);
  const context = await resolveOwnerPaymentContext({ ownerId, payload });
  const payment = await OwnerRentPayment.create(buildPaymentDraft({ ownerId, actorId, source, payload, context }));
  const detailedPayment = await loadOwnerPayment({ ownerId, paymentId: payment._id });

  await notifyPaymentCreated({
    payment,
    tenant: context.tenant,
    property: context.property,
    actorId,
    source
  });

  return mapRentPaymentForProperty(detailedPayment);
};

export const updateOwnerRentPayment = async ({ ownerId, paymentId, payload }) => {
  await seedOwnerWorkspace(ownerId);
  const payment = await OwnerRentPayment.findOne({ _id: paymentId, ownerId });

  if (!payment) {
    throw new AppError("Paiement introuvable", StatusCodes.NOT_FOUND);
  }

  if (!EDITABLE_PAYMENT_STATUSES.has(payment.status)) {
    throw new AppError("Un paiement approuve ne peut plus etre modifie", StatusCodes.BAD_REQUEST);
  }

  let context = null;
  if (payload.managedPropertyId || payload.tenantId || payload.managementContractId) {
    context = await resolveOwnerPaymentContext({
      ownerId,
      payload: {
        managedPropertyId: payload.managedPropertyId || payment.managedPropertyId,
        tenantId: payload.tenantId || payment.tenantId,
        managementContractId: payload.managementContractId || payment.managementContractId
      }
    });
  }

  const nextValues = {
    ...(context ? buildPaymentDraft({ ownerId, actorId: payment.createdByUserId, source: payment.source || "owner", payload: { ...payment.toObject(), ...payload }, context }) : {}),
    ...payload
  };

  Object.assign(payment, nextValues);
  if (!payment.status) payment.status = "pending_approval";
  await payment.save();

  const detailedPayment = await loadOwnerPayment({ ownerId, paymentId: payment._id });
  return mapRentPaymentForProperty(detailedPayment);
};

export const deleteOwnerRentPayment = async ({ ownerId, paymentId, actorId }) => {
  await seedOwnerWorkspace(ownerId);
  const payment = await loadOwnerPayment({ ownerId, paymentId });

  if (!payment.canDelete && APPROVED_PAYMENT_STATUSES.has(payment.status)) {
    throw new AppError("Un paiement approuve ne peut pas etre supprime", StatusCodes.BAD_REQUEST);
  }

  await OwnerRentPayment.deleteOne({ _id: paymentId, ownerId });

  const tenant = resolvePaymentTenant(payment);
  const property = resolvePaymentProperty(payment);
  const tenantUserId = tenant?.linkedUserId?._id || tenant?.linkedUserId || null;

  await createNotifications([
    tenantUserId && buildOwnerNotificationPayload({
      userId: tenantUserId,
      type: "rent.payment.deleted",
      title: "Paiement supprime",
      body: `Un paiement lie a ${property?.title || "un bien"} a ete supprime.`,
      data: { paymentId, propertyId: property?._id ? String(property._id) : null, actorId }
    })
  ]);

  return { success: true, paymentId };
};

export const approveOwnerRentPayment = async ({ ownerId, paymentId }) => {
  await seedOwnerWorkspace(ownerId);
  const payment = await OwnerRentPayment.findOne({ _id: paymentId, ownerId });

  if (!payment) {
    throw new AppError("Paiement introuvable", StatusCodes.NOT_FOUND);
  }

  if (APPROVED_PAYMENT_STATUSES.has(payment.status)) {
    const detailed = await loadOwnerPayment({ ownerId, paymentId });
    return mapRentPaymentForProperty(detailed);
  }

  if (!["pending", "pending_approval", "late"].includes(payment.status)) {
    throw new AppError("Ce paiement ne peut pas etre approuve", StatusCodes.BAD_REQUEST);
  }

  payment.status = "approved";
  payment.approvedAt = new Date();
  payment.approvedByUserId = ownerId;
  payment.receiptNumber = payment.receiptNumber || `Q-${new Date().getFullYear()}-${String(payment._id).slice(-6).toUpperCase()}`;
  payment.receiptGeneratedAt = payment.receiptGeneratedAt || new Date();
  await payment.save();
  await syncContractAfterApprovedPayment(payment);

  const detailedPayment = await loadOwnerPayment({ ownerId, paymentId });
  const tenant = resolvePaymentTenant(detailedPayment);
  const property = resolvePaymentProperty(detailedPayment);
  const tenantUserId = tenant?.linkedUserId?._id || tenant?.linkedUserId || null;

  await createNotifications([
    tenantUserId && buildOwnerNotificationPayload({
      userId: tenantUserId,
      type: "rent.payment.approved",
      title: "Paiement approuve",
      body: `Votre paiement pour ${property?.title || "le bien"} a ete approuve. La quittance est disponible.`,
      data: {
        paymentId,
        propertyId: property?._id ? String(property._id) : null,
        receiptNumber: payment.receiptNumber
      }
    })
  ]);

  return mapRentPaymentForProperty(detailedPayment);
};

export const getOwnerWorkspace = async ({ ownerId }) => {
  await seedOwnerWorkspace(ownerId);

  const [ownerCurrency, properties, contracts, tenants, rents, maintenance, alerts] = await Promise.all([
    resolveOwnerCurrency(ownerId),
    OwnerProperty.find({ ownerId }).sort({ createdAt: -1 }).lean(),
    OwnerContract.find({ ownerId }).sort({ startDate: -1 }).lean(),
    OwnerTenant.find({ ownerId })
      .populate("contractId", "title")
      .populate("managementContractId", "reference title")
      .populate("managedPropertyId", "title address")
      .populate("linkedUserId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean(),
    OwnerRentPayment.find({ ownerId })
      .populate("propertyId", "title")
      .populate("tenantId", "fullName")
      .sort({ dueDate: -1 })
      .lean(),
    OwnerMaintenanceTicket.find({ ownerId })
      .populate("propertyId", "title")
      .populate("managedPropertyId", "title")
      .sort({ updatedAt: -1 })
      .lean(),
    Notification.find({ userId: ownerId, "data.source": OWNER_NOTIFICATION_SOURCE }).sort({ createdAt: -1 }).lean()
  ]);

  const monthlyRevenue = properties.reduce((sum, property) => sum + Number(property.monthlyRevenue || 0), 0);
  const lateRentCount = rents.filter((item) => item.status === "late").length;
  const activeContractsCount = contracts.filter((item) => item.status === "active").length;
  const averageOccupancy = properties.length
    ? Math.round(properties.reduce((sum, property) => sum + Number(property.occupancyRate || 0), 0) / properties.length)
    : 0;

  const upcomingDeadlines = [
    ...contracts
      .filter((contract) => contract.renewalDate)
      .slice(0, 3)
      .map((contract) => ({
        id: `contract-${contract._id}`,
        title: contract.title,
        date: formatDate(contract.renewalDate),
        tag: "Renouvellement"
      })),
    ...maintenance.slice(0, 2).map((ticket) => ({
      id: `maintenance-${ticket._id}`,
      title: ticket.title,
      date: formatDate(ticket.lastUpdateAt || ticket.updatedAt),
      tag: "Maintenance"
    }))
  ].slice(0, 5);

  return {
    summary: {
      monthlyRevenue,
      occupancyRate: averageOccupancy,
      lateRentCount,
      activeContractsCount,
      propertiesCount: properties.length,
      tenantsCount: tenants.length,
      maintenanceCount: maintenance.length
    },
    revenueByProperty: properties.map((property) => ({
      id: String(property._id),
      name: property.title,
      revenue: formatCurrency(property.monthlyRevenue, ownerCurrency),
      yield: `${Number(property.annualYieldRate || 0).toFixed(1)}%`,
      status: propertyStatusLabelMap[property.status] || property.status
    })),
    upcomingDeadlines,
    recentMaintenance: maintenance.slice(0, 3).map((ticket) => ({
      id: String(ticket._id),
      title: ticket.title,
      property: resolveMaintenancePropertyLabel(ticket),
      status: maintenanceStatusLabelMap[ticket.status] || ticket.status,
      date: formatDate(ticket.lastUpdateAt || ticket.updatedAt)
    })),
    alerts: alerts.map((notification) => ({
      id: String(notification._id),
      title: notification.title,
      detail: notification.body,
      tone: notification.type?.includes("late") ? "alert" : notification.type?.includes("renewal") ? "warning" : "info"
    })),
    contracts: contracts.map((contract) => ({
      id: String(contract._id),
      title: contract.title,
      partner: contract.partnerName,
      partnerType: partnerTypeLabelMap[contract.partnerType] || contract.partnerType,
      startDate: formatDate(contract.startDate),
      endDate: formatDate(contract.endDate),
      renewalDate: contract.renewalDate ? formatDate(contract.renewalDate) : "-",
      status: contractStatusLabelMap[contract.status] || contract.status
    })),
    rents: rents.map((rent) => ({
      id: String(rent._id),
      tenant: rent.tenantId?.fullName || "Vacant",
      property: rent.propertyId?.title || "Bien non renseigne",
      dueDate: formatDate(rent.dueDate),
      amount: formatCurrency(rent.amount, ownerCurrency),
      status: rentStatusLabelMap[rent.status] || rent.status,
      receiptNumber: rent.receiptNumber || "-"
    })),
    tenants: tenants.map(mapOwnerTenant),
    properties: properties.map((property) => ({
      id: String(property._id),
      title: property.title,
      surface: `${Number(property.surface || 0).toLocaleString("fr-FR")} m2`,
      location: property.location,
      status: propertyStatusLabelMap[property.status] || property.status,
      history: property.historyLabel || "-",
      photos: property.photosCount || 0
    })),
    maintenance: maintenance.map(mapMaintenanceTicket)
  };
};

const propertyDashboardStatusLabelMap = {
  draft: "Brouillon",
  published: "Libre",
  reserved: "Reserve",
  rented: "Loue",
  sold: "Vendu",
  archived: "Archive"
};

const contractDashboardStatusLabelMap = {
  draft: "Brouillon",
  pending_signature: "Signature en attente",
  signed: "Signe",
  accepted: "Accepte",
  active: "Actif",
  suspended: "Suspendu",
  expired: "Expire",
  terminated: "Termine"
};

const contractPaymentStatusLabelMap = {
  paid: "Paye",
  pending: "En attente",
  late: "En retard",
  overdue: "En retard",
  retard: "En retard",
  "en retard": "En retard"
};

const resolveComparableId = (value) => String(value?._id || value || "");
const normalizePaymentStatus = (value) => String(value || "").trim().toLowerCase();
const isLatePaymentStatus = (value) => ["late", "overdue", "retard", "en retard"].includes(normalizePaymentStatus(value));
const isActiveContractStatus = (value) => ["signed", "accepted", "active"].includes(String(value || "").trim().toLowerCase());

const buildOwnerDashboardPropertyMetrics = ({ properties, contracts }) => {
  const contractByPropertyId = new Map();

  contracts.forEach((contract) => {
    const propertyKey = resolveComparableId(contract.propertyId);

    if (propertyKey && !contractByPropertyId.has(propertyKey)) {
      contractByPropertyId.set(propertyKey, contract);
    }
  });

  return properties.map((property) => {
    const propertyKey = resolveComparableId(property._id);
    const propertyContract = contractByPropertyId.get(propertyKey) || null;
    const currentRevenue =
      property.purpose === "rent" && propertyContract && isActiveContractStatus(propertyContract.status)
        ? Number(propertyContract.financial?.rentAmount || 0)
        : 0;
    const ownerShare = Number(propertyContract?.distribution?.ownerShare || 0);
    const annualYieldRate =
      property.price > 0 && currentRevenue > 0
        ? Number((((currentRevenue * 12) / Number(property.price || 1)) * 100).toFixed(1))
        : 0;

    return {
      id: propertyKey,
      title: property.title,
      address: property.address || "-",
      status: propertyDashboardStatusLabelMap[property.status] || property.status,
      monthlyRevenue: currentRevenue,
      yield: `${annualYieldRate.toFixed(1)}%`,
      ownerShare: ownerShare ? `${ownerShare}%` : "-",
      purpose: property.purpose
    };
  });
};

export const getOwnerDashboard = async ({ ownerId }) => {
  const [ownerCurrency, properties, contracts, tenants, maintenance, notifications] = await Promise.all([
    resolveOwnerCurrency(ownerId),
    Property.find({ ownerUserId: ownerId })
      .select("title address price purpose status ownerUserId createdAt updatedAt")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    ManagementContract.find({ ownerUserId: ownerId })
      .select("reference status startDate endDate renewalDate propertyId financial distribution paymentTracking tenants")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    OwnerTenant.find({ ownerId }).sort({ createdAt: -1 }).lean(),
    OwnerMaintenanceTicket.find({ ownerId })
      .populate("managedPropertyId", "title")
      .populate("propertyId", "title")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    Notification.find({ userId: ownerId }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  const revenueByProperty = buildOwnerDashboardPropertyMetrics({ properties, contracts });
  const rentProperties = properties.filter((property) => property.purpose === "rent");
  const rentedProperties = rentProperties.filter((property) => property.status === "rented");
  const lateRentCount = contracts.filter((contract) => isLatePaymentStatus(contract.paymentTracking?.status)).length;
  const activeContracts = contracts.filter((contract) => isActiveContractStatus(contract.status));
  const occupancyRate = rentProperties.length ? Math.round((rentedProperties.length / rentProperties.length) * 100) : 0;
  const monthlyRevenue = revenueByProperty.reduce((sum, property) => sum + Number(property.monthlyRevenue || 0), 0);
  const upcomingDeadlines = [
    ...contracts
      .filter((contract) => contract.renewalDate || contract.endDate)
      .sort((left, right) => new Date(left.renewalDate || left.endDate) - new Date(right.renewalDate || right.endDate))
      .slice(0, 4)
      .map((contract) => ({
        id: String(contract._id),
        title: contract.reference || "Contrat",
        date: formatDate(contract.renewalDate || contract.endDate),
        tag: contract.renewalDate ? "Renouvellement" : "Fin de contrat"
      })),
    ...maintenance
      .filter((ticket) => ["planned", "in_progress"].includes(ticket.status))
      .slice(0, 2)
      .map((ticket) => ({
        id: `maintenance-${ticket._id}`,
        title: ticket.title,
        date: formatDate(ticket.lastUpdateAt || ticket.updatedAt),
        tag: "Maintenance"
      }))
  ].slice(0, 5);

  return {
    summary: {
      monthlyRevenue,
      occupancyRate,
      lateRentCount,
      activeContractsCount: activeContracts.length,
      propertiesCount: properties.length,
      tenantsCount: tenants.length,
      maintenanceCount: maintenance.length
    },
    revenueByProperty: revenueByProperty.map((property) => ({
      id: property.id,
      name: property.title,
      revenue: formatCurrency(property.monthlyRevenue, ownerCurrency),
      yield: property.yield,
      status: property.status,
      ownerShare: property.ownerShare
    })),
    upcomingDeadlines,
    recentMaintenance: maintenance.slice(0, 3).map((ticket) => ({
      id: String(ticket._id),
      title: ticket.title,
      property: resolveMaintenancePropertyLabel(ticket),
      status: maintenanceStatusLabelMap[ticket.status] || ticket.status,
      date: formatDate(ticket.lastUpdateAt || ticket.updatedAt)
    })),
    alerts: notifications.map((notification) => ({
      id: String(notification._id),
      title: notification.title,
      detail: notification.body,
      tone: notification.type?.includes("late") ? "alert" : notification.type?.includes("renewal") ? "warning" : "info"
    })),
    contracts: activeContracts.map((contract) => ({
      id: String(contract._id),
      title: contract.reference || "Contrat",
      partner: "-",
      partnerType: "-",
      startDate: formatDate(contract.startDate),
      endDate: formatDate(contract.endDate),
      renewalDate: contract.renewalDate ? formatDate(contract.renewalDate) : "-",
      status: contractDashboardStatusLabelMap[contract.status] || contract.status
    })),
    rents: contracts
      .filter((contract) => contract.propertyId)
      .map((contract) => ({
        id: String(contract._id),
        tenant: contract.tenants?.find((tenant) => tenant.isMainTenant)?.fullName || contract.tenants?.[0]?.fullName || "Vacant",
        property: revenueByProperty.find((property) => property.id === resolveComparableId(contract.propertyId))?.title || "Bien non renseigne",
        dueDate: contract.paymentTracking?.nextPaymentDate ? formatDate(contract.paymentTracking.nextPaymentDate) : "-",
        amount: formatCurrency(contract.financial?.rentAmount || 0, ownerCurrency),
        status: contractPaymentStatusLabelMap[normalizePaymentStatus(contract.paymentTracking?.status)] || contract.paymentTracking?.status || "-",
        receiptNumber: "-"
      })),
    tenants: tenants.map(mapOwnerTenant),
    properties: properties.map((property) => ({
      id: String(property._id),
      title: property.title,
      surface: "-",
      location: property.address || "-",
      status: propertyDashboardStatusLabelMap[property.status] || property.status,
      history: property.purpose === "rent" ? "Bien locatif synchronise" : "Bien synchronise",
      photos: 0
    })),
    maintenance: maintenance.map(mapMaintenanceTicket)
  };
};

export const getOwnerTenantsManagement = async ({ ownerId, filters = {} }) => {
  const propertyFilter = filters.propertyId || null;
  const propertyQuery = {
    ownerUserId: ownerId,
    ...(propertyFilter ? { _id: propertyFilter } : {})
  };
  const tenantQuery = {
    ownerId,
    ...(propertyFilter ? { managedPropertyId: propertyFilter } : {})
  };
  const paymentQuery = {
    ownerId,
    ...(propertyFilter ? { managedPropertyId: propertyFilter } : {})
  };
  const feedbackQuery = {
    ownerId,
    ...(propertyFilter ? { propertyId: propertyFilter } : {})
  };

  const [ownerCurrency, properties, contracts, tenants, payments, feedbacks] = await Promise.all([
    resolveOwnerCurrency(ownerId),
    Property.find(propertyQuery)
      .select("title address price currency purpose status coverImage managementContractId")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    ManagementContract.find({
      ownerUserId: ownerId,
      ...(propertyFilter ? { propertyId: propertyFilter } : {})
    })
      .select("reference status startDate endDate propertyId financial paymentTracking tenants")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    OwnerTenant.find(tenantQuery)
      .populate("linkedUserId", "firstName lastName email phone avatar")
      .populate("managedPropertyId", "title address currency price")
      .populate("managementContractId", "reference status financial paymentTracking")
      .sort({ createdAt: -1 })
      .lean(),
    populateRentPaymentQuery(OwnerRentPayment.find(paymentQuery).sort({ dueDate: -1, createdAt: -1 })).lean(),
    UserPropertyFeedback.find(feedbackQuery)
      .populate("userId", "firstName lastName email phone avatar")
      .populate("propertyId", "title address")
      .populate("tenantId", "fullName")
      .populate("managementContractId", "reference")
      .sort({ createdAt: -1 })
      .lean()
  ]);

  const mappedPayments = payments.map(mapRentPaymentForProperty);
  const approvedPayments = mappedPayments.filter((payment) => APPROVED_PAYMENT_STATUSES.has(payment.status));
  const latePayments = mappedPayments.filter((payment) => payment.status === "late");
  const activeContracts = contracts.filter((contract) => isActiveContractStatus(contract.status));
  const totalExpected = activeContracts.reduce((sum, contract) => sum + Number(contract.financial?.rentAmount || 0), 0);
  const totalPaid = approvedPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);
  const totalLate = latePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paymentsByTenant = new Map();
  mappedPayments.forEach((payment) => {
    if (!payment.tenantId) return;
    if (!paymentsByTenant.has(payment.tenantId)) paymentsByTenant.set(payment.tenantId, []);
    paymentsByTenant.get(payment.tenantId).push(payment);
  });

  return {
    dashboard: {
      totalExpected,
      totalExpectedLabel: formatCurrency(totalExpected, ownerCurrency),
      totalPaid,
      totalPaidLabel: formatCurrency(totalPaid, ownerCurrency),
      totalLate,
      totalLateLabel: formatCurrency(totalLate, ownerCurrency),
      monthlyRevenue: totalPaid,
      monthlyRevenueLabel: formatCurrency(totalPaid, ownerCurrency),
      activeTenantsCount: tenants.length,
      activeContractsCount: activeContracts.length,
      upcomingPayments: mappedPayments
        .filter((payment) => ["pending", "pending_approval"].includes(payment.status))
        .sort((left, right) => new Date(left.dueDate || 0) - new Date(right.dueDate || 0))
        .slice(0, 6),
      lateAlerts: latePayments.slice(0, 6).map((payment) => ({
        id: payment.id,
        title: "Paiement en retard",
        detail: `${payment.tenant} - ${payment.property} - ${payment.amountLabel}`,
        paymentId: payment.id
      }))
    },
    properties: properties.map((property) => ({
      id: String(property._id),
      title: property.title,
      address: property.address || "",
      currency: property.currency || ownerCurrency,
      rentAmount: Number(property.price || 0),
      status: property.status,
      purpose: property.purpose,
      coverImage: property.coverImage || null,
      managementContractId: property.managementContractId ? String(property.managementContractId) : null
    })),
    tenants: tenants.map((tenant) => {
      const tenantPayments = paymentsByTenant.get(String(tenant._id)) || [];
      return {
        ...mapOwnerTenant(tenant),
        linkedUser: mapTenantUser(tenant.linkedUserId),
        propertyId: tenant.managedPropertyId?._id ? String(tenant.managedPropertyId._id) : tenant.managedPropertyId ? String(tenant.managedPropertyId) : null,
        propertyAddress: tenant.managedPropertyId?.address || "",
        contractId: tenant.managementContractId?._id ? String(tenant.managementContractId._id) : tenant.managementContractId ? String(tenant.managementContractId) : null,
        contractStatus: tenant.managementContractId?.status || "",
        rentAmount: Number(tenant.managementContractId?.financial?.rentAmount || tenant.managedPropertyId?.price || 0),
        currency: tenant.managementContractId?.financial?.currency || tenant.managedPropertyId?.currency || ownerCurrency,
        score: calculateTenantScore({ payments: tenantPayments }),
        paymentsSummary: `${tenantPayments.filter((payment) => APPROVED_PAYMENT_STATUSES.has(payment.status)).length}/${tenantPayments.length}`
      };
    }),
    payments: mappedPayments,
    receipts: mappedPayments.filter((payment) => payment.receiptNumber || APPROVED_PAYMENT_STATUSES.has(payment.status)),
    feedbacks: feedbacks.map((feedback) => ({
      ...mapOwnerPropertyFeedback(feedback),
      propertyId: feedback.propertyId?._id ? String(feedback.propertyId._id) : feedback.propertyId ? String(feedback.propertyId) : null,
      property: feedback.propertyId?.title || "Bien non renseigne",
      tenant: feedback.tenantId?.fullName || feedback.userId?.fullName || ""
    })),
    filters: {
      propertyId: propertyFilter
    }
  };
};

export const createOwnerMaintenanceTicket = async ({ ownerId, payload }) => {
  await seedOwnerWorkspace(ownerId);

  const managedProperty = await ensureManagedPropertyOwnership({
    ownerId,
    managedPropertyId: payload.managedPropertyId
  });

  const ticket = await OwnerMaintenanceTicket.create({
    ownerId,
    propertyId: payload.propertyId || null,
    managedPropertyId: managedProperty._id,
    propertyLabel: payload.propertyLabel || managedProperty.title,
    title: payload.title,
    description: payload.description || "",
    priority: payload.priority,
    assignee: payload.assignee || "",
    status: payload.status,
    maintenanceAmount: payload.maintenanceAmount || 0,
    currency: payload.currency || "USD",
    lastUpdateAt: payload.lastUpdateAt,
    lastUpdateLabel: formatDate(payload.lastUpdateAt)
  });

  const detailedTicket = await OwnerMaintenanceTicket.findById(ticket._id)
    .populate("propertyId", "title")
    .populate("managedPropertyId", "title")
    .lean();

  await createMaintenanceNotification({ ownerId, action: "created", ticket: detailedTicket });

  return mapMaintenanceTicket(detailedTicket);
};

export const syncOwnerTenantFromClosedWon = async ({ ownerId, managedPropertyId, userId }) =>
  upsertOwnerTenantFromClosedWon({ ownerId, managedPropertyId, userId });

export const createOwnerTenant = async ({ ownerId, payload }) => {
  await seedOwnerWorkspace(ownerId);

  const property = await ensureManagedPropertyForOwnerTenant({
    ownerId,
    managedPropertyId: payload.managedPropertyId
  });

  const linkedUser = payload.linkedUserId ? await ensureLinkedUser(payload.linkedUserId) : null;
  const tenantDraft = linkedUser
    ? {
        ...buildOwnerTenantDraftFromUser({
          user: linkedUser,
          managedPropertyId: property._id,
          managementContractId: payload.managementContractId || property.managementContractId || null,
          source: "manual"
        }),
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim(),
        email: payload.email,
        phone: payload.phone || "",
        cin: payload.cin || "",
        adresse: payload.adresse || "",
        sexe: payload.sexe,
        contact: payload.phone || payload.email || "",
        identityDocument: payload.cin || ""
      }
    : {
        linkedUserId: null,
        managedPropertyId: property._id,
        managementContractId: payload.managementContractId || property.managementContractId || null,
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim(),
        email: payload.email,
        phone: payload.phone || "",
        cin: payload.cin || "",
        adresse: payload.adresse || "",
        sexe: payload.sexe,
        contact: payload.phone || payload.email || "",
        identityDocument: payload.cin || "",
        source: "manual"
      };

  const tenant = await OwnerTenant.create({
    ownerId,
    ...tenantDraft,
    documentsCount: payload.documentsCount || 0,
    paymentHistoryLabel: payload.paymentHistoryLabel || ""
  });

  const detailedTenant = await OwnerTenant.findById(tenant._id)
    .populate("contractId", "title")
    .populate("managementContractId", "reference title")
    .populate("managedPropertyId", "title address")
    .populate("linkedUserId", "firstName lastName email")
    .lean();

  return mapOwnerTenant(detailedTenant);
};

export const updateOwnerTenant = async ({ ownerId, tenantId, payload }) => {
  await seedOwnerWorkspace(ownerId);

  const tenant = await OwnerTenant.findOne({ _id: tenantId, ownerId });

  if (!tenant) {
    throw new AppError("Locataire introuvable", StatusCodes.NOT_FOUND);
  }

  const property = await ensureManagedPropertyForOwnerTenant({
    ownerId,
    managedPropertyId: payload.managedPropertyId
  });

  const linkedUser = payload.linkedUserId ? await ensureLinkedUser(payload.linkedUserId) : null;
  const nextTenantValues = linkedUser
    ? {
        ...buildOwnerTenantDraftFromUser({
          user: linkedUser,
          managedPropertyId: property._id,
          managementContractId: payload.managementContractId || property.managementContractId || null,
          source: tenant.source === "booking_closed_won" ? "booking_closed_won" : "manual"
        }),
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim(),
        email: payload.email,
        phone: payload.phone || "",
        cin: payload.cin || "",
        adresse: payload.adresse || "",
        sexe: payload.sexe,
        contact: payload.phone || payload.email || "",
        identityDocument: payload.cin || ""
      }
    : {
        linkedUserId: null,
        managedPropertyId: property._id,
        managementContractId: payload.managementContractId || property.managementContractId || null,
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim(),
        email: payload.email,
        phone: payload.phone || "",
        cin: payload.cin || "",
        adresse: payload.adresse || "",
        sexe: payload.sexe,
        contact: payload.phone || payload.email || "",
        identityDocument: payload.cin || "",
        source: "manual"
      };

  Object.assign(tenant, {
    ...nextTenantValues,
    documentsCount: payload.documentsCount || 0,
    paymentHistoryLabel: payload.paymentHistoryLabel || ""
  });

  await tenant.save();

  const detailedTenant = await OwnerTenant.findById(tenant._id)
    .populate("contractId", "title")
    .populate("managementContractId", "reference title")
    .populate("managedPropertyId", "title address")
    .populate("linkedUserId", "firstName lastName email")
    .lean();

  return mapOwnerTenant(detailedTenant);
};

export const deleteOwnerTenant = async ({ ownerId, tenantId }) => {
  await seedOwnerWorkspace(ownerId);

  const tenant = await OwnerTenant.findOne({ _id: tenantId, ownerId });

  if (!tenant) {
    throw new AppError("Locataire introuvable", StatusCodes.NOT_FOUND);
  }

  if (tenant.managedPropertyId) {
    const property = await Property.findOne({ _id: tenant.managedPropertyId, ownerUserId: ownerId });

    if (property && property.purpose === "rent") {
      property.status = "published";
      property.reservedByUserId = null;
      property.reservedAt = null;
      await property.save();
    }
  }

  await OwnerTenant.deleteOne({ _id: tenantId, ownerId });

  return {
    success: true,
    tenantId,
    releasedManagedPropertyId: tenant.managedPropertyId ? String(tenant.managedPropertyId) : null
  };
};

export const updateOwnerMaintenanceTicket = async ({ ownerId, ticketId, payload }) => {
  await seedOwnerWorkspace(ownerId);

  const existingTicket = await OwnerMaintenanceTicket.findOne({ _id: ticketId, ownerId });

  if (!existingTicket) {
    throw new AppError("Ticket introuvable", StatusCodes.NOT_FOUND);
  }

  const managedProperty = await ensureManagedPropertyOwnership({
    ownerId,
    managedPropertyId: payload.managedPropertyId
  });

  existingTicket.propertyId = payload.propertyId || null;
  existingTicket.managedPropertyId = managedProperty._id;
  existingTicket.propertyLabel = payload.propertyLabel || managedProperty.title;
  existingTicket.title = payload.title;
  existingTicket.description = payload.description || "";
  existingTicket.priority = payload.priority;
  existingTicket.assignee = payload.assignee || "";
  existingTicket.status = payload.status;
  existingTicket.maintenanceAmount = payload.maintenanceAmount || 0;
  existingTicket.currency = payload.currency || "USD";
  existingTicket.lastUpdateAt = payload.lastUpdateAt;
  existingTicket.lastUpdateLabel = formatDate(payload.lastUpdateAt);
  await existingTicket.save();

  const detailedTicket = await OwnerMaintenanceTicket.findById(existingTicket._id)
    .populate("propertyId", "title")
    .populate("managedPropertyId", "title")
    .lean();

  await createMaintenanceNotification({ ownerId, action: "updated", ticket: detailedTicket });

  return mapMaintenanceTicket(detailedTicket);
};

export const deleteOwnerMaintenanceTicket = async ({ ownerId, ticketId }) => {
  await seedOwnerWorkspace(ownerId);

  const ticket = await OwnerMaintenanceTicket.findOne({ _id: ticketId, ownerId })
    .populate("propertyId", "title")
    .populate("managedPropertyId", "title")
    .lean();

  if (!ticket) {
    throw new AppError("Ticket introuvable", StatusCodes.NOT_FOUND);
  }

  await OwnerMaintenanceTicket.deleteOne({ _id: ticketId, ownerId });
  await createMaintenanceNotification({ ownerId, action: "deleted", ticket });

  return { success: true, ticketId };
};

export const getOwnerPropertyTenantWorkspace = async ({ ownerId, propertyId }) => {
  const property = await Property.findOne({ _id: propertyId, ownerUserId: ownerId })
    .select("title slug address purpose status price currency area rooms bedrooms bathrooms coverImage media score")
    .lean();

  if (!property) {
    throw new AppError("Bien introuvable pour ce proprietaire", StatusCodes.NOT_FOUND);
  }

  const [tenants, contracts, maintenance, feedbacks] = await Promise.all([
    OwnerTenant.find({ ownerId, managedPropertyId: propertyId })
      .populate("linkedUserId", "firstName lastName email phone avatar")
      .populate("managementContractId", "reference status startDate endDate financial paymentTracking")
      .sort({ createdAt: -1 })
      .lean(),
    ManagementContract.find({ ownerUserId: ownerId, propertyId })
      .select("reference status startDate endDate financial paymentTracking tenants documents")
      .sort({ updatedAt: -1 })
      .lean(),
    OwnerMaintenanceTicket.find({ ownerId, managedPropertyId: propertyId }).sort({ updatedAt: -1 }).lean(),
    UserPropertyFeedback.find({ ownerId, propertyId })
      .populate("userId", "firstName lastName email phone avatar")
      .sort({ createdAt: -1 })
      .lean()
  ]);

  const tenantIds = tenants.map((tenant) => tenant._id);
  const payments = tenantIds.length
    ? await populateRentPaymentQuery(OwnerRentPayment.find({ ownerId, tenantId: { $in: tenantIds } }).sort({ dueDate: -1 })).lean()
    : [];

  const paidPayments = payments.filter((payment) => APPROVED_PAYMENT_STATUSES.has(payment.status));
  const latePayments = payments.filter((payment) => payment.status === "late");
  await ensureLateRentNotifications({ ownerId, property, latePayments });
  const monthlyRevenue = paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paymentsByTenant = new Map();
  payments.forEach((payment) => {
    const tenantKey = payment.tenantId?._id ? String(payment.tenantId._id) : String(payment.tenantId || "");
    if (!paymentsByTenant.has(tenantKey)) paymentsByTenant.set(tenantKey, []);
    paymentsByTenant.get(tenantKey).push(payment);
  });

  return {
    property: {
      id: String(property._id),
      title: property.title,
      slug: property.slug,
      address: property.address,
      purpose: property.purpose,
      status: property.status,
      price: Number(property.price || 0),
      currency: property.currency || "USD",
      area: Number(property.area || 0),
      rooms: Number(property.rooms || 0),
      bedrooms: Number(property.bedrooms || 0),
      bathrooms: Number(property.bathrooms || 0),
      coverImage: property.coverImage || null,
      media: property.media || [],
      score: Number(property.score || 0)
    },
    dashboard: {
      totalRents: payments.length,
      paidRents: paidPayments.length,
      lateRents: latePayments.length,
      monthlyRevenue,
      monthlyRevenueLabel: formatCurrency(monthlyRevenue, property.currency || "USD"),
      alerts: [
        ...latePayments.slice(0, 4).map((payment) => ({
          id: `late-${payment._id}`,
          title: "Loyer en retard",
          detail: `${payment.tenantId?.fullName || "Locataire"} - ${formatCurrency(payment.amount, payment.currency || property.currency || "USD")}`,
          tone: "alert"
        })),
        ...maintenance.filter((ticket) => ticket.status !== "closed").slice(0, 3).map((ticket) => ({
          id: `maintenance-${ticket._id}`,
          title: ticket.title,
          detail: maintenanceStatusLabelMap[ticket.status] || ticket.status,
          tone: "info"
        }))
      ]
    },
    tenants: tenants.map((tenant) => {
      const tenantPayments = paymentsByTenant.get(String(tenant._id)) || [];
      return {
        ...mapOwnerTenant(tenant),
        linkedUser: mapTenantUser(tenant.linkedUserId),
        score: calculateTenantScore({ payments: tenantPayments }),
        payments: tenantPayments.map(mapRentPaymentForProperty),
        contractDetail: tenant.managementContractId ? {
          id: String(tenant.managementContractId._id),
          reference: tenant.managementContractId.reference,
          status: tenant.managementContractId.status,
          startDateLabel: formatDate(tenant.managementContractId.startDate),
          endDateLabel: formatDate(tenant.managementContractId.endDate)
        } : null
      };
    }),
    receipts: payments.map(mapRentPaymentForProperty),
    contracts: contracts.map((contract) => ({
      id: String(contract._id),
      reference: contract.reference,
      status: contract.status,
      startDateLabel: formatDate(contract.startDate),
      endDateLabel: formatDate(contract.endDate),
      amountLabel: formatCurrency(contract.financial?.rentAmount || 0, contract.financial?.currency || property.currency || "USD"),
      documentUrl: contract.documents?.contractFile || ""
    })),
    feedbacks: feedbacks.map(mapOwnerPropertyFeedback)
  };
};

export const generateOwnerPropertyReceipt = async ({ ownerId, propertyId, paymentId }) => {
  const workspace = await getOwnerPropertyTenantWorkspace({ ownerId, propertyId });

  if (!workspace.receipts.some((receipt) => String(receipt.id) === String(paymentId))) {
    throw new AppError("Paiement introuvable pour ce bien", StatusCodes.NOT_FOUND);
  }

  const payment = await OwnerRentPayment.findOne({ _id: paymentId, ownerId })
    .populate("tenantId", "fullName linkedUserId")
    .lean();

  if (!payment) {
    throw new AppError("Paiement introuvable", StatusCodes.NOT_FOUND);
  }

  if (!RECEIPT_PAYMENT_STATUSES.has(payment.status)) {
    throw new AppError("Une quittance ne peut etre generee que pour un paiement approuve", StatusCodes.BAD_REQUEST);
  }

  const receiptNumber = payment.receiptNumber || `Q-${new Date().getFullYear()}-${String(payment._id).slice(-6).toUpperCase()}`;
  const updatedPayment = await OwnerRentPayment.findByIdAndUpdate(
    payment._id,
    { $set: { receiptNumber, receiptGeneratedAt: new Date() } },
    { new: true }
  )
    .populate("tenantId", "fullName linkedUserId")
    .lean();

  if (updatedPayment?.tenantId?.linkedUserId) {
    await createNotifications([
      buildOwnerNotificationPayload({
        userId: updatedPayment.tenantId.linkedUserId,
        type: "owner.receipt.generated",
        title: "Quittance generee",
        body: `La quittance ${receiptNumber} est disponible.`,
        data: { propertyId, paymentId, receiptNumber }
      })
    ]);
  }

  return mapRentPaymentForProperty(updatedPayment);
};

export const markOwnerPropertyFeedbackHandled = async ({ ownerId, propertyId, feedbackId }) => {
  const feedback = await UserPropertyFeedback.findOneAndUpdate(
    { _id: feedbackId, ownerId, propertyId },
    { $set: { status: "handled", handledAt: new Date() } },
    { new: true }
  )
    .populate("userId", "firstName lastName email phone avatar")
    .lean();

  if (!feedback) {
    throw new AppError("Feedback introuvable", StatusCodes.NOT_FOUND);
  }

  if (feedback.userId?._id) {
    await createNotifications([
      buildOwnerNotificationPayload({
        userId: feedback.userId._id,
        type: "owner.feedback.handled",
        title: "Feedback traite",
        body: "Votre feedback lie au bien a ete marque comme traite.",
        data: { propertyId, feedbackId }
      })
    ]);
  }

  return mapOwnerPropertyFeedback(feedback);
};

