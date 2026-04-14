import { Notification } from "../notifications/notification.model.js";
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
  const existingPropertiesCount = await OwnerProperty.countDocuments({ ownerId });

  if (existingPropertiesCount) {
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
      contractId: contractPalmier._id,
      fullName: "Miora Randria",
      contact: "+261 34 12 345 67",
      identityDocument: "CIN 123 456 789",
      documentsCount: 4,
      paymentHistoryLabel: "Regulier"
    },
    {
      ownerId,
      propertyId: horizon._id,
      contractId: contractHorizon._id,
      fullName: "Tiana Razan",
      contact: "tiana@locataire.mg",
      identityDocument: "Passeport MG90876",
      documentsCount: 6,
      paymentHistoryLabel: "2 retards"
    },
    {
      ownerId,
      propertyId: riviera._id,
      contractId: contractRiviera._id,
      fullName: "Hasina Andriam",
      contact: "+261 32 44 556 78",
      identityDocument: "CIN 987 654 321",
      documentsCount: 5,
      paymentHistoryLabel: "Sous surveillance"
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

export const getOwnerWorkspace = async ({ ownerId }) => {
  await seedOwnerWorkspace(ownerId);

  const [properties, contracts, tenants, rents, maintenance, alerts] = await Promise.all([
    OwnerProperty.find({ ownerId }).sort({ createdAt: -1 }).lean(),
    OwnerContract.find({ ownerId }).sort({ startDate: -1 }).lean(),
    OwnerTenant.find({ ownerId }).populate("contractId", "title").sort({ createdAt: -1 }).lean(),
    OwnerRentPayment.find({ ownerId })
      .populate("propertyId", "title")
      .populate("tenantId", "fullName")
      .sort({ dueDate: -1 })
      .lean(),
    OwnerMaintenanceTicket.find({ ownerId }).populate("propertyId", "title").sort({ updatedAt: -1 }).lean(),
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
      date: ticket.lastUpdateLabel || formatDate(ticket.updatedAt),
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
      property: ticket.propertyId?.title || "Bien non renseigne",
      status: maintenanceStatusLabelMap[ticket.status] || ticket.status,
      date: ticket.lastUpdateLabel || formatDate(ticket.updatedAt)
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
    tenants: tenants.map((tenant) => ({
      id: String(tenant._id),
      fullName: tenant.fullName,
      contact: tenant.contact || "-",
      identity: tenant.identityDocument || "-",
      documents: tenant.documentsCount || 0,
      paymentHistory: tenant.paymentHistoryLabel || "-",
      contract: tenant.contractId?.title || "Aucun contrat"
    })),
    properties: properties.map((property) => ({
      id: String(property._id),
      title: property.title,
      surface: `${Number(property.surface || 0).toLocaleString("fr-FR")} m2`,
      location: property.location,
      status: propertyStatusLabelMap[property.status] || property.status,
      history: property.historyLabel || "-",
      photos: property.photosCount || 0
    })),
    maintenance: maintenance.map((ticket) => ({
      id: String(ticket._id),
      title: ticket.title,
      property: ticket.propertyId?.title || "Bien non renseigne",
      priority: priorityLabelMap[ticket.priority] || ticket.priority,
      assignee: ticket.assignee || "-",
      status: maintenanceStatusLabelMap[ticket.status] || ticket.status,
      lastUpdate: ticket.lastUpdateLabel || formatDate(ticket.updatedAt)
    }))
  };
};
