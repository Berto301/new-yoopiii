import fs from "node:fs/promises";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Agency } from "../agencies/agency.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { DataFile } from "../files/data-file.model.js";
import { createNotifications } from "../notifications/notifications.service.js";
import { recalculateAgencyScore, recalculateAgentScore } from "../scoring/scoring.service.js";
import { OwnerTenant } from "../owner/models/owner-tenant.model.js";
import { Property } from "../properties/property.model.js";
import { User } from "../users/user.model.js";
import { ManagementContract } from "./management-contract.model.js";

const SINGLETON_DATAFILE_KINDS = new Set(["profile-avatar", "agency-logo", "agency-cover"]);
export const MANAGEABLE_CONTRACT_STATUSES = new Set(["signed", "accepted", "active"]);

const CONTRACT_STATUS_LABELS = {
  draft: "Brouillon",
  pending_signature: "En signature",
  signed: "Signe",
  accepted: "Accepte",
  active: "Actif",
  suspended: "Suspendu",
  expired: "Expire",
  terminated: "Resilie"
};

const MANAGER_ROLE_LABELS = {
  agency: "Agence",
  independent_agent: "Agent independant"
};

const DOCUMENT_KIND_LABELS = {
  contract_signed: "Contrat signe",
  owner_identity: "Identite proprietaire",
  agent_identity: "Identite agent",
  agency_documents: "Documents agence",
  property_document: "Document bien",
  annex: "Annexe",
  legal_document: "Document legal"
};

const deleteFileIfExists = async (storagePath) => {
  if (!storagePath) return;

  try {
    await fs.unlink(storagePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
};

const resolveComparableId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value);
};

const normalizePropertyLabel = (property) => {
  const surface = property.area ? `${Number(property.area).toLocaleString("fr-FR")} m2` : "surface non renseignee";
  return `${property.title} â€¢ ${property.address} â€¢ ${surface}`;
};

const buildNotificationRecipients = (values) =>
  [...new Set(values.filter(Boolean).map((value) => String(value)))];
const syncContractScores = async (contract) => {
  const agentId = contract?.responsibleAgentUserId || (contract?.managerRole === "independent_agent" ? contract?.managerUserId : null) || contract?.agent?.id;
  const tasks = [];

  if (agentId) tasks.push(recalculateAgentScore(agentId));
  if (contract?.agencyId) tasks.push(recalculateAgencyScore(contract.agencyId));

  await Promise.all(tasks.map((task) => task.catch(() => null)));
};

export const isContractCurrentlyActive = (contract) => {
  if (!contract || !isManageableContractStatus(contract.status)) {
    return false;
  }

  const now = new Date();
  const startsAt = contract.startDate ? new Date(contract.startDate) : null;
  const endsAt = contract.endDate ? new Date(contract.endDate) : null;

  if (startsAt && startsAt > now) {
    return false;
  }

  if (endsAt && endsAt < now) {
    return false;
  }

  return true;
};

export const isManageableContractStatus = (status) => MANAGEABLE_CONTRACT_STATUSES.has(String(status || "").trim().toLowerCase());

const resolveManagerScope = (actor) => {
  if (actor.role === "agency" || actor.role === "agency_agent") {
    if (!actor.agencyId) {
      throw new AppError("Agency context not found", StatusCodes.BAD_REQUEST);
    }

    return {
      managerRole: "agency",
      agencyId: actor.agencyId,
      managerUserId: null
    };
  }

  if (actor.role === "independent_agent") {
    return {
      managerRole: "independent_agent",
      agencyId: null,
      managerUserId: actor.id
    };
  }

  throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
};

const buildContractActorMatch = (actor) => {
  if (actor.role === "proprietaire") {
    return { ownerUserId: actor.id };
  }

  const scope = resolveManagerScope(actor);
  return scope.managerRole === "agency"
    ? { managerRole: "agency", agencyId: scope.agencyId }
    : { managerRole: "independent_agent", managerUserId: scope.managerUserId };
};

const buildManageableContractActorMatch = (actor) => {
  if (actor.role === "proprietaire") {
    return { ownerUserId: actor.id };
  }

  if (actor.role === "agency") {
    if (!actor.agencyId) {
      throw new AppError("Agency context not found", StatusCodes.BAD_REQUEST);
    }

    return { managerRole: "agency", agencyId: actor.agencyId };
  }

  if (actor.role === "agency_agent") {
    if (!actor.agencyId) {
      throw new AppError("Agency context not found", StatusCodes.BAD_REQUEST);
    }

    return { managerRole: "agency", agencyId: actor.agencyId, responsibleAgentUserId: actor.id };
  }

  if (actor.role === "independent_agent") {
    return { managerRole: "independent_agent", managerUserId: actor.id };
  }

  throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
};

const mapDocument = (document) => ({
  id: String(document._id),
  kind: document.kind,
  kindLabel: DOCUMENT_KIND_LABELS[document.kind] || document.kind,
  originalName: document.originalName,
  mimeType: document.mimeType,
  size: document.size,
  publicPath: document.publicPath,
  createdAt: document.createdAt
});

const mapContractTenants = (tenants = []) =>
  (tenants || []).map((tenant) => ({
    tenantId: tenant.tenantId ? String(tenant.tenantId) : null,
    fullName: tenant.fullName || "",
    phone: tenant.phone || "",
    email: tenant.email || "",
    isMainTenant: Boolean(tenant.isMainTenant)
  }));

const mapOwnerTenantToContractTenant = (tenant, index = 0) => ({
  tenantId: tenant.linkedUserId ? String(tenant.linkedUserId) : tenant.tenantId ? String(tenant.tenantId) : null,
  fullName: tenant.fullName || "",
  phone: tenant.phone || tenant.contact || "",
  email: tenant.email || "",
  isMainTenant: index === 0
});

const hydrateContract = async (contract) => {
  const [documents, coveredProperties, linkedOwnerTenants] = await Promise.all([
    DataFile.find({ ownerContractId: contract._id }).sort({ createdAt: -1 }).lean(),
    Property.find({ managementContractId: contract._id }).select("title address status area").lean(),
    OwnerTenant.find({
      ownerId: contract.ownerUserId?._id || contract.ownerUserId,
      $or: [
        { managementContractId: contract._id },
        ...(contract.propertyId ? [{ managedPropertyId: contract.propertyId }] : [])
      ]
    })
      .sort({ createdAt: 1 })
      .lean()
  ]);

  const resolvedTenants = linkedOwnerTenants.length
    ? linkedOwnerTenants.map(mapOwnerTenantToContractTenant)
    : mapContractTenants(contract.tenants);

  return {
    id: String(contract._id),
    reference: contract.reference,
    contractType: contract.contractType,
    status: contract.status,
    statusLabel: CONTRACT_STATUS_LABELS[contract.status] || contract.status,
    signatureDate: contract.signatureDate,
    signatureDateLabel: formatDate(contract.signatureDate),
    startDate: contract.startDate,
    startDateLabel: formatDate(contract.startDate),
    endDate: contract.endDate,
    endDateLabel: formatDate(contract.endDate),
    renewalDate: contract.renewalDate,
    renewalDateLabel: formatDate(contract.renewalDate),
    isActive: isContractCurrentlyActive(contract),
    owner: contract.ownerUserId
      ? {
          id: String(contract.ownerUserId._id || contract.ownerUserId),
          fullName: [contract.ownerUserId.firstName, contract.ownerUserId.lastName].filter(Boolean).join(" ").trim(),
          email: contract.ownerUserId.email || "",
          phone: contract.ownerUserId.phone || "",
          avatar: contract.ownerUserId.avatar || null
        }
      : null,
    manager: contract.managerRole === "agency"
      ? {
          role: "agency",
          label: MANAGER_ROLE_LABELS.agency,
          id: contract.agencyId?._id ? String(contract.agencyId._id) : String(contract.agencyId || ""),
          name: contract.agencyId?.name || "Agence"
        }
      : {
          role: "independent_agent",
          label: MANAGER_ROLE_LABELS.independent_agent,
          id: contract.managerUserId?._id ? String(contract.managerUserId._id) : String(contract.managerUserId || ""),
          name: [contract.managerUserId?.firstName, contract.managerUserId?.lastName].filter(Boolean).join(" ").trim() || contract.managerUserId?.email || "Agent"
        },
    propertyId: contract.propertyId ? String(contract.propertyId) : null,
    agency: contract.agency
      ? {
          id: contract.agency.id ? String(contract.agency.id) : null,
          name: contract.agency.name || contract.agencyId?.name || "",
          commission: Number(contract.agency.commission || 0),
          fees: Number(contract.agency.fees || 0)
        }
      : null,
    agent: contract.agent
      ? {
          id: contract.agent.id ? String(contract.agent.id) : contract.managerUserId?._id ? String(contract.managerUserId._id) : null,
          name:
            contract.agent.name ||
            [contract.managerUserId?.firstName, contract.managerUserId?.lastName].filter(Boolean).join(" ").trim() ||
            contract.responsibleAgent?.fullName ||
            "",
          commission: Number(contract.agent.commission || 0),
          fees: Number(contract.agent.fees || 0)
        }
      : null,
    tenants: resolvedTenants,
    linkedTenants: linkedOwnerTenants.map((tenant) => ({
      id: String(tenant._id),
      linkedUserId: tenant.linkedUserId ? String(tenant.linkedUserId) : null,
      fullName: tenant.fullName || "",
      phone: tenant.phone || tenant.contact || "",
      email: tenant.email || "",
      cin: tenant.cin || "",
      adresse: tenant.adresse || "",
      sexe: tenant.sexe || "",
      propertyId: tenant.managedPropertyId ? String(tenant.managedPropertyId) : null
    })),
    mainTenant: resolvedTenants.find((tenant) => tenant.isMainTenant) || null,
    renewable: Boolean(contract.renewable),
    responsibleAgent: contract.responsibleAgentUserId
      ? {
          id: String(contract.responsibleAgentUserId._id || contract.responsibleAgentUserId),
          fullName: [contract.responsibleAgentUserId.firstName, contract.responsibleAgentUserId.lastName].filter(Boolean).join(" ").trim(),
          email: contract.responsibleAgentUserId.email || ""
        }
      : null,
    mandateType: contract.mandateType || "",
    mission: contract.mission || "",
    commission: contract.commission || "",
    paymentConditions: contract.paymentConditions || "",
    noticePeriod: contract.noticePeriod || "",
    terminationConditions: contract.terminationConditions || "",
    specialClauses: contract.specialClauses || "",
    legalFramework: contract.legalFramework || "",
    jurisdiction: contract.jurisdiction || "",
    propertyReference: contract.propertyReference || "",
    financial: {
      rentAmount: Number(contract.financial?.rentAmount || 0),
      charges: Number(contract.financial?.charges || 0),
      deposit: Number(contract.financial?.deposit || 0),
      currency: contract.financial?.currency || "USD",
      paymentFrequency: contract.financial?.paymentFrequency || "monthly",
      paymentMethod: contract.financial?.paymentMethod || ""
    },
    distribution: {
      ownerShare: Number(contract.distribution?.ownerShare || 0),
      agencyShare: Number(contract.distribution?.agencyShare || 0)
    },
    paymentTracking: {
      status: contract.paymentTracking?.status || "",
      lastPaymentDate: contract.paymentTracking?.lastPaymentDate || null,
      nextPaymentDate: contract.paymentTracking?.nextPaymentDate || null,
      lastPaymentDateLabel: formatDate(contract.paymentTracking?.lastPaymentDate),
      nextPaymentDateLabel: formatDate(contract.paymentTracking?.nextPaymentDate)
    },
    documentsMeta: {
      contractFile: contract.documents?.contractFile || "",
      attachments: contract.documents?.attachments || []
    },
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
    },
    notes: contract.notes || "",
    terms: contract.terms || "",
    coveredProperties: coveredProperties.map((property) => ({
      id: String(property._id),
      title: property.title,
      address: property.address,
      status: property.status,
      label: normalizePropertyLabel(property)
    })),
    documents: documents.map(mapDocument)
  };
};

const syncContractDocuments = async ({ contractId, documentIds = [], actor }) => {
  if (!documentIds.length) {
    return [];
  }

  const matchQuery = {
    _id: { $in: documentIds },
    ...(actor.agencyId ? { ownerAgencyId: actor.agencyId } : { ownerUserId: actor.id }),
    kind: { $nin: [...SINGLETON_DATAFILE_KINDS] }
  };

  await DataFile.updateMany(matchQuery, { $set: { ownerContractId: contractId } });

  return DataFile.find({ ownerContractId: contractId }).lean();
};

const validateOwnerUser = async (ownerUserId) => {
  const owner = await User.findOne({ _id: ownerUserId, role: "proprietaire", status: "active" }).lean();

  if (!owner) {
    throw new AppError("Owner not found", StatusCodes.NOT_FOUND);
  }

  return owner;
};

const validateAgency = async (agencyId) => {
  const agency = await Agency.findOne({ _id: agencyId, status: "active" }).lean();

  if (!agency) {
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  return agency;
};

const validateIndependentAgent = async (userId) => {
  const agent = await User.findOne({ _id: userId, role: "independent_agent", status: "active" })
    .select("firstName lastName email")
    .lean();

  if (!agent) {
    throw new AppError("Independent agent not found", StatusCodes.NOT_FOUND);
  }

  return agent;
};

const validateResponsibleAgent = async ({ actor, managerRole, agencyId, managerUserId, responsibleAgentUserId }) => {
  if (managerRole === "independent_agent") {
    const agent = await validateIndependentAgent(managerUserId);
    return {
      id: String(agent._id),
      documentValue: agent._id
    };
  }

  const agency = await Agency.findById(agencyId).select("ownerUserId").lean();

  if (!agency?.ownerUserId) {
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  const targetUserId =
    responsibleAgentUserId ||
    managerUserId ||
    (actor.role === "proprietaire" ? agency.ownerUserId : actor.id);

  if (resolveComparableId(targetUserId) === resolveComparableId(actor.id)) {
    const actorUser = await User.findById(actor.id).select("firstName lastName email").lean();

    if (!actorUser) {
      throw new AppError("Responsible agent not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: String(actorUser._id),
      documentValue: actorUser._id
    };
  }

  if (resolveComparableId(targetUserId) === resolveComparableId(agency.ownerUserId)) {
    return {
      id: String(agency.ownerUserId),
      documentValue: agency.ownerUserId
    };
  }

  const membership = await AgencyMember.findOne({
    agencyId,
    userId: targetUserId,
    status: "active"
  })
    .populate("userId", "firstName lastName email")
    .lean();

  if (!membership?.userId) {
    throw new AppError("Responsible agent must belong to this agency", StatusCodes.BAD_REQUEST);
  }

  return {
    id: String(membership.userId._id),
    documentValue: membership.userId._id
  };
};

const ensureContractAccess = async ({ contractId, actor }) => {
  const contract = await ManagementContract.findById(contractId)
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .populate("managerUserId", "firstName lastName email")
    .populate("responsibleAgentUserId", "firstName lastName email")
    .populate("agencyId", "name ownerUserId")
    .lean();

  if (!contract) {
    throw new AppError("Contract not found", StatusCodes.NOT_FOUND);
  }

  const match = buildContractActorMatch(actor);
  const hasAccess = Object.entries(match).every(([key, value]) => resolveComparableId(contract[key]) === resolveComparableId(value));

  if (!hasAccess) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  return contract;
};

export const listManagerOwners = async () => {
  const owners = await User.find({ role: "proprietaire", status: "active" })
    .select("firstName lastName email phone avatar")
    .sort({ firstName: 1, lastName: 1 })
    .lean();

  return owners.map((owner) => ({
    id: String(owner._id),
    fullName: [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim(),
    email: owner.email || "",
    phone: owner.phone || "",
    avatar: owner.avatar || null
  }));
};

export const listAvailableContractAgents = async (actor) => {
  if (actor.role === "independent_agent") {
    const agent = await User.findById(actor.id).select("firstName lastName email").lean();
    return agent
      ? [{ id: String(agent._id), label: [agent.firstName, agent.lastName].filter(Boolean).join(" ").trim() || agent.email, email: agent.email || "" }]
      : [];
  }

  if (!["agency", "agency_agent"].includes(actor.role) || !actor.agencyId) {
    return [];
  }

  const [agencyOwner, members] = await Promise.all([
    User.findById(actor.id).select("firstName lastName email").lean(),
    AgencyMember.find({ agencyId: actor.agencyId, status: "active" })
      .populate("userId", "firstName lastName email")
      .lean()
  ]);

  const seen = new Set();
  const options = [];

  const pushUser = (user) => {
    if (!user || seen.has(String(user._id))) return;
    seen.add(String(user._id));
    options.push({
      id: String(user._id),
      label: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
      email: user.email || ""
    });
  };

  pushUser(agencyOwner);
  members.forEach((member) => pushUser(member.userId));

  return options;
};

export const listAvailableContractProperties = async (actor) => {
  let query = null;

  if (actor.role === "proprietaire") {
    query = { ownerUserId: actor.id };
  } else if (actor.role === "independent_agent") {
    query = { agentId: actor.id };
  } else if ((actor.role === "agency" || actor.role === "agency_agent") && actor.agencyId) {
    query = { agencyId: actor.agencyId };
  }

  if (!query) {
    return [];
  }

  const properties = await Property.find(query)
    .select("title address area status purpose price currency managementContractId")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return properties.map((property) => ({
    id: String(property._id),
    label: normalizePropertyLabel(property),
    status: property.status,
    purpose: property.purpose,
    price: Number(property.price || 0),
    currency: property.currency || "USD",
    managementContractId: property.managementContractId ? String(property.managementContractId) : null
  }));
};

export const listManagementContracts = async ({ actor, status }) => {
  const match = buildContractActorMatch(actor);
  const query = {
    ...match,
    ...(!status && actor.role !== "proprietaire" ? { status: { $ne: "terminated" } } : {}),
    ...(status ? { status } : {})
  };

  const contracts = await ManagementContract.find(query)
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .populate("managerUserId", "firstName lastName email")
    .populate("responsibleAgentUserId", "firstName lastName email")
    .populate("agencyId", "name ownerUserId")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return Promise.all(contracts.map((contract) => hydrateContract(contract)));
};

export const getManagementContractById = async ({ contractId, actor }) => {
  const contract = await ensureContractAccess({ contractId, actor });
  return hydrateContract(contract);
};

export const getActiveManagementContractIdsForActor = async (actor) => {
  if (!["agency", "agency_agent", "independent_agent", "proprietaire"].includes(actor.role)) {
    return [];
  }

  const match = buildManageableContractActorMatch(actor);
  const contracts = await ManagementContract.find({
    ...match,
    status: { $in: [...MANAGEABLE_CONTRACT_STATUSES] }
  }).select("_id").lean();

  return contracts.map((contract) => String(contract._id));
};

export const getManageableManagementContractsForActor = async (actor) => {
  if (!["agency", "agency_agent", "independent_agent", "proprietaire"].includes(actor.role)) {
    return [];
  }

  const match = buildManageableContractActorMatch(actor);

  return ManagementContract.find({
    ...match,
    status: { $in: [...MANAGEABLE_CONTRACT_STATUSES] }
  })
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .populate("managerUserId", "firstName lastName email")
    .populate("responsibleAgentUserId", "firstName lastName email")
    .populate("agencyId", "name ownerUserId")
    .lean();
};

export const getActiveManagementContractsForActor = async (actor) => {
  const ids = await getActiveManagementContractIdsForActor(actor);

  if (!ids.length) {
    return [];
  }

  const contracts = await ManagementContract.find({ _id: { $in: ids } })
    .populate("ownerUserId", "firstName lastName email phone avatar")
    .populate("managerUserId", "firstName lastName email")
    .populate("responsibleAgentUserId", "firstName lastName email")
    .populate("agencyId", "name ownerUserId")
    .lean();

  return Promise.all(contracts.map((contract) => hydrateContract(contract)));
};

export const validateActiveContractForActor = async ({ contractId, actor }) => {
  const contract = await ensureContractAccess({ contractId, actor });

  if (!isManageableContractStatus(contract.status)) {
    throw new AppError("An accepted or active contract is required to manage this property", StatusCodes.FORBIDDEN);
  }

  if (
    actor.role === "agency_agent" &&
    (contract.managerRole !== "agency" ||
      resolveComparableId(contract.agencyId) !== resolveComparableId(actor.agencyId) ||
      resolveComparableId(contract.responsibleAgentUserId) !== resolveComparableId(actor.id))
  ) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  return contract;
};

const buildContractPayload = async ({ actor, payload, existingContract = null }) => {
  let ownerUserId = existingContract?.ownerUserId || null;
  let managerRole = existingContract?.managerRole || null;
  let agencyId = existingContract?.agencyId || null;
  let managerUserId = existingContract?.managerUserId || null;
  let propertyId = payload.propertyId ?? existingContract?.propertyId ?? null;

  if (actor.role === "proprietaire") {
    ownerUserId = actor.id;
    managerRole =
      payload.managerRole ??
      (payload.contractType === "agency" ? "agency" : payload.contractType === "agent" ? "independent_agent" : existingContract?.managerRole);

    if (!managerRole) {
      throw new AppError("Manager role is required", StatusCodes.BAD_REQUEST);
    }

    if (managerRole === "agency") {
      const agency = await validateAgency(payload.agencyId ?? existingContract?.agencyId);
      agencyId = agency._id;
      managerUserId = null;
    } else {
      const agent = await validateIndependentAgent(payload.managerUserId ?? payload.agentId ?? existingContract?.managerUserId);
      managerUserId = agent._id;
      agencyId = null;
    }
  } else {
    const owner = payload.ownerUserId ? await validateOwnerUser(payload.ownerUserId) : null;
    const scope = resolveManagerScope(actor);
    ownerUserId = owner?._id || existingContract?.ownerUserId;
    managerRole = scope.managerRole;
    agencyId = scope.managerRole === "agency" ? scope.agencyId : null;
    managerUserId = scope.managerRole === "independent_agent" ? scope.managerUserId : null;
  }

  const responsibleAgent = await validateResponsibleAgent({
    actor,
    managerRole,
    agencyId,
    managerUserId,
    responsibleAgentUserId: payload.responsibleAgentUserId ?? existingContract?.responsibleAgentUserId
  });

  return {
    reference: payload.reference ?? existingContract?.reference,
    contractType: payload.contractType ?? existingContract?.contractType,
    status:
      actor.role === "proprietaire" && !existingContract
        ? "pending_signature"
        : payload.status ?? existingContract?.status ?? "draft",
    signatureDate: payload.signatureDate !== undefined ? (payload.signatureDate ? new Date(payload.signatureDate) : null) : existingContract?.signatureDate || null,
    startDate: payload.startDate ? new Date(payload.startDate) : existingContract?.startDate,
    endDate: payload.endDate ? new Date(payload.endDate) : existingContract?.endDate,
    renewalDate: payload.renewalDate !== undefined ? (payload.renewalDate ? new Date(payload.renewalDate) : null) : existingContract?.renewalDate || null,
    ownerUserId,
    agencyId,
    managerUserId,
    responsibleAgentUserId: responsibleAgent.documentValue,
    managerRole,
    propertyId,
    agency: {
      id: payload.agency?.id ?? agencyId ?? existingContract?.agency?.id ?? null,
      name: payload.agency?.name ?? existingContract?.agency?.name ?? "",
      commission: Number(payload.agency?.commission ?? existingContract?.agency?.commission ?? 0),
      fees: Number(payload.agency?.fees ?? existingContract?.agency?.fees ?? 0)
    },
    agent: {
      id: payload.agent?.id ?? managerUserId ?? existingContract?.agent?.id ?? null,
      name: payload.agent?.name ?? existingContract?.agent?.name ?? "",
      commission: Number(payload.agent?.commission ?? existingContract?.agent?.commission ?? 0),
      fees: Number(payload.agent?.fees ?? existingContract?.agent?.fees ?? 0)
    },
    tenants: (payload.tenants ?? existingContract?.tenants ?? []).map((tenant) => ({
      tenantId: tenant.tenantId || null,
      fullName: tenant.fullName || "",
      phone: tenant.phone || "",
      email: tenant.email || "",
      isMainTenant: Boolean(tenant.isMainTenant)
    })),
    renewable: payload.renewable ?? existingContract?.renewable ?? false,
    mandateType: payload.mandateType ?? existingContract?.mandateType ?? "",
    mission: payload.mission ?? existingContract?.mission ?? "",
    commission: payload.commission ?? existingContract?.commission ?? "",
    paymentConditions: payload.paymentConditions ?? existingContract?.paymentConditions ?? "",
    noticePeriod: payload.noticePeriod ?? existingContract?.noticePeriod ?? "",
    terminationConditions: payload.terminationConditions ?? existingContract?.terminationConditions ?? "",
    specialClauses: payload.specialClauses ?? existingContract?.specialClauses ?? "",
    legalFramework: payload.legalFramework ?? existingContract?.legalFramework ?? "",
    jurisdiction: payload.jurisdiction ?? existingContract?.jurisdiction ?? "",
    propertyReference: payload.propertyReference ?? existingContract?.propertyReference ?? "",
    financial: {
      rentAmount: Number(payload.financial?.rentAmount ?? existingContract?.financial?.rentAmount ?? 0),
      charges: Number(payload.financial?.charges ?? existingContract?.financial?.charges ?? 0),
      deposit: Number(payload.financial?.deposit ?? existingContract?.financial?.deposit ?? 0),
      currency: payload.financial?.currency ?? existingContract?.financial?.currency ?? "USD",
      paymentFrequency: payload.financial?.paymentFrequency ?? existingContract?.financial?.paymentFrequency ?? "monthly",
      paymentMethod: payload.financial?.paymentMethod ?? existingContract?.financial?.paymentMethod ?? ""
    },
    distribution: {
      ownerShare: Number(payload.distribution?.ownerShare ?? existingContract?.distribution?.ownerShare ?? 0),
      agencyShare: Number(payload.distribution?.agencyShare ?? existingContract?.distribution?.agencyShare ?? 0)
    },
    paymentTracking: {
      status: payload.paymentTracking?.status ?? existingContract?.paymentTracking?.status ?? "",
      lastPaymentDate:
        payload.paymentTracking?.lastPaymentDate !== undefined
          ? payload.paymentTracking?.lastPaymentDate
            ? new Date(payload.paymentTracking.lastPaymentDate)
            : null
          : existingContract?.paymentTracking?.lastPaymentDate ?? null,
      nextPaymentDate:
        payload.paymentTracking?.nextPaymentDate !== undefined
          ? payload.paymentTracking?.nextPaymentDate
            ? new Date(payload.paymentTracking.nextPaymentDate)
            : null
          : existingContract?.paymentTracking?.nextPaymentDate ?? null
    },
    documents: {
      contractFile: payload.documents?.contractFile ?? existingContract?.documents?.contractFile ?? "",
      attachments: payload.documents?.attachments ?? existingContract?.documents?.attachments ?? []
    },
    actions: {
      canPublishProperty: payload.actions?.canPublishProperty ?? existingContract?.actions?.canPublishProperty ?? true,
      canReserveProperty: payload.actions?.canReserveProperty ?? existingContract?.actions?.canReserveProperty ?? true,
      canEditProperty: payload.actions?.canEditProperty ?? existingContract?.actions?.canEditProperty ?? false,
      canDeleteProperty: payload.actions?.canDeleteProperty ?? existingContract?.actions?.canDeleteProperty ?? false,
      publicationOwnerDisplay: {
        showOwnerName:
          payload.actions?.publicationOwnerDisplay?.showOwnerName ??
          existingContract?.actions?.publicationOwnerDisplay?.showOwnerName ??
          false,
        showOwnerContact:
          payload.actions?.publicationOwnerDisplay?.showOwnerContact ??
          existingContract?.actions?.publicationOwnerDisplay?.showOwnerContact ??
          false,
        allowDirectOwnerChat:
          payload.actions?.publicationOwnerDisplay?.allowDirectOwnerChat ??
          existingContract?.actions?.publicationOwnerDisplay?.allowDirectOwnerChat ??
          false
      }
    },
    notes: payload.notes ?? existingContract?.notes ?? "",
    terms: payload.terms ?? existingContract?.terms ?? "",
    createdByUserId: existingContract?.createdByUserId || actor.id
  };
};

const syncContractProperties = async ({ contractId, propertyIds = [], contract, actor }) => {
  const nextIds = [...new Set((propertyIds || []).map(String))];
  const existingLinkedProperties = await Property.find({ managementContractId: contractId }).select("_id").lean();
  const existingIds = existingLinkedProperties.map((property) => String(property._id));

  if (!nextIds.length) {
    if (existingIds.length) {
      await Property.updateMany({ _id: { $in: existingIds } }, { $set: { managementContractId: null } });
    }
    return;
  }

  let matchQuery = { _id: { $in: nextIds } };

  if (actor.role === "proprietaire") {
    matchQuery.ownerUserId = contract.ownerUserId;
  } else if (contract.managerRole === "agency") {
    matchQuery.agencyId = contract.agencyId;
  } else {
    matchQuery.agentId = contract.managerUserId;
  }

  const properties = await Property.find(matchQuery).select("_id ownerUserId").lean();

  if (properties.length !== nextIds.length) {
    throw new AppError("Some selected properties are not accessible for this contract", StatusCodes.BAD_REQUEST);
  }

  const wrongOwnerProperty = properties.find((property) => resolveComparableId(property.ownerUserId) !== resolveComparableId(contract.ownerUserId));

  if (wrongOwnerProperty) {
    throw new AppError("All linked properties must belong to the same owner as the contract", StatusCodes.BAD_REQUEST);
  }

  const nextObjectIds = properties.map((property) => property._id);
  const agentId = contract.managerRole === "agency" ? contract.responsibleAgentUserId || actor.id : contract.managerUserId;

  await Property.updateMany(
    { _id: { $in: nextObjectIds } },
    {
      $set: {
        managementContractId: contractId,
        contractRequestId: contractId,
        contractRequestStatus: contract.status,
        ownerUserId: contract.ownerUserId,
        ownerType: contract.managerRole,
        agencyId: contract.managerRole === "agency" ? contract.agencyId : null,
        agentId
      }
    }
  );

  const idsToUnset = existingIds.filter((propertyId) => !nextIds.includes(propertyId));

  if (idsToUnset.length) {
      await Property.updateMany({ _id: { $in: idsToUnset } }, { $set: { managementContractId: null } });
  }
};

const createContractNotifications = async ({ contract, actor, action }) => {
  const contractLabel = contract.reference || contract.contractType || "Contrat";
  const recipients = buildNotificationRecipients([
    contract.ownerUserId?._id || contract.ownerUserId,
    contract.managerUserId?._id || contract.managerUserId,
    contract.agencyId?.ownerUserId || null,
    contract.responsibleAgentUserId?._id || contract.responsibleAgentUserId
  ]);

  const title = {
    created: `Contrat ${contractLabel} cree`,
    updated: `Contrat ${contractLabel} mis a jour`,
    deleted: `Contrat ${contractLabel} supprime`
  }[action];

  const body = {
    created: `Le contrat ${contractLabel} est maintenant enregistre avec le statut ${CONTRACT_STATUS_LABELS[contract.status] || contract.status}.`,
    updated: `Le contrat ${contractLabel} a ete mis a jour. Nouveau statut: ${CONTRACT_STATUS_LABELS[contract.status] || contract.status}.`,
    deleted: `Le contrat ${contractLabel} a ete supprime et les biens associes ont ete conserves.`
  }[action];

  await createNotifications(
    recipients.map((userId) => ({
      userId,
      type: `contract.${action}`,
      title,
      body,
      data: {
        contractId: String(contract._id || contract.id),
        contractReference: contract.reference,
        actorId: actor.id
      },
      channel: "in_app"
    }))
  );
};

export const createManagementContract = async ({ actor, payload }) => {
  if (actor.role !== "proprietaire") {
    throw new AppError("Only owners can create contracts for now", StatusCodes.FORBIDDEN, null, {
      type: "authorization_error",
      field: "role"
    });
  }

  const data = await buildContractPayload({ actor, payload });
  const contract = await ManagementContract.create(data);
  await syncContractDocuments({ contractId: contract._id, documentIds: payload.documentIds || [], actor });
  await syncContractProperties({ contractId: contract._id, propertyIds: payload.propertyIds || [], contract, actor });

  const detailedContract = await ensureContractAccess({ contractId: contract._id, actor });
  await createContractNotifications({ contract: detailedContract, actor, action: "created" });
  await syncContractScores(detailedContract);

  return getManagementContractById({ contractId: contract._id, actor });
};

export const updateManagementContract = async ({ contractId, actor, payload }) => {
  const existing = await ensureContractAccess({ contractId, actor });
  const contractDocument = await ManagementContract.findById(contractId);
  const data = await buildContractPayload({ actor, payload, existingContract: existing });

  Object.assign(contractDocument, data);
  await contractDocument.save();

  if (payload.documentIds) {
    await syncContractDocuments({ contractId, documentIds: payload.documentIds, actor });
  }

  const shouldAttachRequestedProperty =
    !payload.propertyIds &&
    contractDocument.propertyId &&
    MANAGEABLE_CONTRACT_STATUSES.has(contractDocument.status);

  if (payload.propertyIds || shouldAttachRequestedProperty) {
    await syncContractProperties({
      contractId,
      propertyIds: payload.propertyIds || [String(contractDocument.propertyId)],
      contract: contractDocument,
      actor
    });
  }

  const detailedContract = await ensureContractAccess({ contractId, actor });
  await createContractNotifications({ contract: detailedContract, actor, action: "updated" });
  await syncContractScores(detailedContract);

  return getManagementContractById({ contractId, actor });
};

export const deleteManagementContract = async ({ contractId, actor }) => {
  const contract = await ensureContractAccess({ contractId, actor });
  const linkedProperties = await Property.find({ managementContractId: contractId }).select("_id").lean();
  const linkedPropertyIds = linkedProperties.map((property) => property._id);

  if (linkedPropertyIds.length) {
    await Property.updateMany(
      { _id: { $in: linkedPropertyIds } },
      {
        $set: {
          managementContractId: null,
          ownerType: "proprietaire",
          agencyId: null,
          agentId: contract.ownerUserId?._id || contract.ownerUserId
        }
      }
    );
  }

  const files = await DataFile.find({ ownerContractId: contractId }).lean();
  await Promise.all(files.map((fileItem) => deleteFileIfExists(fileItem.storagePath)));
  await DataFile.deleteMany({ ownerContractId: contractId });
  await ManagementContract.deleteOne({ _id: contractId });

  await createContractNotifications({ contract, actor, action: "deleted" });
  await syncContractScores(contract);

  return { success: true, contractId };
};

export const uploadManagementContractDocument = async ({ actor, contractId = null, kind, file }) => {
  if (!["agency", "agency_agent", "independent_agent", "proprietaire"].includes(actor.role)) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  if (!file) {
    throw new AppError("Contract document file is required", StatusCodes.BAD_REQUEST);
  }

  if (contractId) {
    await ensureContractAccess({ contractId, actor });
  }

  const dataFile = await DataFile.create({
    ownerUserId: actor.role === "agency" || actor.role === "agency_agent" ? null : actor.id,
    ownerAgencyId: actor.role === "agency" || actor.role === "agency_agent" ? actor.agencyId : null,
    ownerContractId: contractId || null,
    kind,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storagePath: file.path,
    publicPath: `/uploads/contracts/${file.filename}`
  });

  return mapDocument(dataFile.toObject());
};
