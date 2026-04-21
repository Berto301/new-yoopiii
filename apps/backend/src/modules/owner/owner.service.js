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

const OWNER_NOTIFICATION_SOURCE = "owner_workspace_seed";
const ownerSeedLocks = new Map();

const OWNER_PROPERTY_SEED = [
  {
    title: "Residence Palmier",
    surface: 180,
    location: "Ivandry, Antananarivo",
    photosCount: 14,
    status: "loue",
    historyLabel: "Loue depuis mars 2026",
    monthlyRevenue: 2100000,
    annualYieldRate: 8.2,
    occupancyRate: 100
  },
  {
    title: "Villa Horizon",
    surface: 260,
    location: "Ambohitrarahaba, Antananarivo",
    photosCount: 22,
    status: "loue",
    historyLabel: "Bail renouvele en fevrier 2026",
    monthlyRevenue: 1850000,
    annualYieldRate: 7.6,
    occupancyRate: 100
  },
  {
    title: "Studio Baobab",
    surface: 48,
    location: "Analamahitsy, Antananarivo",
    photosCount: 8,
    status: "libre",
    historyLabel: "Libre apres sortie locataire en avril 2026",
    monthlyRevenue: 1100000,
    annualYieldRate: 6.8,
    occupancyRate: 0
  },
  {
    title: "Immeuble Riviera",
    surface: 620,
    location: "Tamatave centre",
    photosCount: 31,
    status: "en_travaux",
    historyLabel: "Renovation facade et reseau eau",
    monthlyRevenue: 3400000,
    annualYieldRate: 9.4,
    occupancyRate: 75
  }
];

const runOwnerWorkspaceSeed = async (ownerId) => {
  const [existingPropertiesCount, existingManagedPropertiesCount, existingRealTenantsCount] = await Promise.all([
    OwnerProperty.countDocuments({ ownerId }),
    Property.countDocuments({ ownerUserId: ownerId }),
    OwnerTenant.countDocuments({ ownerId, managedPropertyId: { $ne: null } })
  ]);

  if (existingPropertiesCount || existingManagedPropertiesCount || existingRealTenantsCount) {
    return;
  }

  const properties = await OwnerProperty.insertMany(
    OWNER_PROPERTY_SEED.map((item) => ({
      ownerId,
      ...item
    }))
  );

  const [palmier, horizon, baobab, riviera] = properties;

  const contracts = await OwnerContract.insertMany([
    {
      ownerId,
      propertyId: palmier._id,
      title: "Bail habitation - Residence Palmier",
      partnerName: "Agence Oceanis",
      partnerType: "agency",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      renewalDate: new Date("2026-12-01T00:00:00.000Z"),
      status: "active"
    },
    {
      ownerId,
      propertyId: horizon._id,
      title: "Mandat de gestion - Villa Horizon",
      partnerName: "Rado Rakoto",
      partnerType: "independent_agent",
      startDate: new Date("2026-02-15T00:00:00.000Z"),
      endDate: new Date("2027-02-14T00:00:00.000Z"),
      renewalDate: new Date("2027-01-15T00:00:00.000Z"),
      status: "active"
    },
    {
      ownerId,
      propertyId: riviera._id,
      title: "Bail commercial - Immeuble Riviera",
      partnerName: "Agence Capital Immo",
      partnerType: "agency",
      startDate: new Date("2025-03-01T00:00:00.000Z"),
      endDate: new Date("2028-02-28T00:00:00.000Z"),
      renewalDate: new Date("2028-01-01T00:00:00.000Z"),
      status: "archived"
    }
  ]);

  const [contractPalmier, contractHorizon, contractRiviera] = contracts;

  const tenants = await OwnerTenant.insertMany([
    {
      ownerId,
      propertyId: palmier._id,
      firstName: "Miora",
      lastName: "Randria",
      contractId: contractPalmier._id,
      fullName: "Miora Randria",
      email: "",
      phone: "+261 34 12 345 67",
      contact: "+261 34 12 345 67",
      cin: "CIN 123 456 789",
      identityDocument: "CIN 123 456 789",
      documentsCount: 4,
      paymentHistoryLabel: "Regulier",
      source: "legacy_seed"
    },
    {
      ownerId,
      propertyId: horizon._id,
      firstName: "Tiana",
      lastName: "Razan",
      contractId: contractHorizon._id,
      fullName: "Tiana Razan",
      email: "tiana@locataire.mg",
      phone: "",
      contact: "tiana@locataire.mg",
      identityDocument: "Passeport MG90876",
      documentsCount: 6,
      paymentHistoryLabel: "2 retards",
      source: "legacy_seed"
    },
    {
      ownerId,
      propertyId: riviera._id,
      firstName: "Hasina",
      lastName: "Andriam",
      contractId: contractRiviera._id,
      fullName: "Hasina Andriam",
      email: "",
      phone: "+261 32 44 556 78",
      contact: "+261 32 44 556 78",
      cin: "CIN 987 654 321",
      identityDocument: "CIN 987 654 321",
      documentsCount: 5,
      paymentHistoryLabel: "Sous surveillance",
      source: "legacy_seed"
    }
  ]);

  const [tenantPalmier, tenantHorizon, tenantRiviera] = tenants;

  await OwnerRentPayment.insertMany([
    {
      ownerId,
      propertyId: palmier._id,
      tenantId: tenantPalmier._id,
      dueDate: new Date("2026-04-05T00:00:00.000Z"),
      amount: 700000,
      status: "paid",
      receiptNumber: "Q-2026-041"
    },
    {
      ownerId,
      propertyId: horizon._id,
      tenantId: tenantHorizon._id,
      dueDate: new Date("2026-04-08T00:00:00.000Z"),
      amount: 1250000,
      status: "late",
      receiptNumber: ""
    },
    {
      ownerId,
      propertyId: baobab._id,
      tenantId: null,
      dueDate: new Date("2026-04-10T00:00:00.000Z"),
      amount: 450000,
      status: "paid",
      receiptNumber: "Q-2026-042"
    },
    {
      ownerId,
      propertyId: riviera._id,
      tenantId: tenantRiviera._id,
      dueDate: new Date("2026-04-12T00:00:00.000Z"),
      amount: 1900000,
      status: "late",
      receiptNumber: ""
    }
  ]);

  await OwnerMaintenanceTicket.insertMany([
    {
      ownerId,
      propertyId: palmier._id,
      title: "Humidite salle d'eau",
      priority: "high",
      assignee: "TechHabitat",
      status: "in_progress",
      lastUpdateLabel: "13 avril 2026"
    },
    {
      ownerId,
      propertyId: riviera._id,
      title: "Reprise peinture facade",
      priority: "medium",
      assignee: "Batipro",
      status: "planned",
      lastUpdateLabel: "11 avril 2026"
    },
    {
      ownerId,
      propertyId: horizon._id,
      title: "Revision chauffe-eau",
      priority: "low",
      assignee: "Thermo Services",
      status: "closed",
      lastUpdateLabel: "09 avril 2026"
    }
  ]);

  await Notification.insertMany([
    {
      userId: ownerId,
      type: "owner.rent.late",
      title: "Deux loyers en retard",
      body: "Villa Horizon et Immeuble Riviera necessitent une relance immediate.",
      channel: "in_app",
      data: { source: OWNER_NOTIFICATION_SOURCE }
    },
    {
      userId: ownerId,
      type: "owner.contract.renewal",
      title: "Fin de bail a anticiper",
      body: "Le bail de Residence Palmier arrive a renouvellement dans 17 jours.",
      channel: "in_app",
      data: { source: OWNER_NOTIFICATION_SOURCE }
    },
    {
      userId: ownerId,
      type: "owner.maintenance.preventive",
      title: "Maintenance preventive recommandee",
      body: "Inspection toiture conseillee avant la saison des pluies.",
      channel: "in_app",
      data: { source: OWNER_NOTIFICATION_SOURCE }
    }
  ]);
};

const seedOwnerWorkspace = async (ownerId) => {
  const ownerKey = String(ownerId);

  if (ownerSeedLocks.has(ownerKey)) {
    await ownerSeedLocks.get(ownerKey);
    return;
  }

  const seedPromise = runOwnerWorkspaceSeed(ownerId)
    .finally(() => {
      ownerSeedLocks.delete(ownerKey);
    });

  ownerSeedLocks.set(ownerKey, seedPromise);
  await seedPromise;
};

const formatDate = (value) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
const formatCurrency = (value) => `${Number(value || 0).toLocaleString("fr-FR")} Ar`;

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
  late: "En retard",
  pending: "En attente"
};

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
    .select("title ownerUserId")
    .lean();

  if (!property) {
    throw new AppError("Bien introuvable pour ce proprietaire", StatusCodes.NOT_FOUND);
  }

  return property;
};

export const getOwnerWorkspace = async ({ ownerId }) => {
  await seedOwnerWorkspace(ownerId);

  const [properties, contracts, tenants, rents, maintenance, alerts] = await Promise.all([
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
      revenue: formatCurrency(property.monthlyRevenue),
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
      amount: formatCurrency(rent.amount),
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
  const [properties, contracts, tenants, maintenance, notifications] = await Promise.all([
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
      revenue: formatCurrency(property.monthlyRevenue),
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
        amount: formatCurrency(contract.financial?.rentAmount || 0),
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
