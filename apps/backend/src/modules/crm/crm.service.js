import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { Agency } from "../agencies/agency.model.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { createNotifications } from "../notifications/notifications.service.js";
import { Property } from "../properties/property.model.js";
import { CrmMetadata, CRM_PIPELINE_STAGES } from "./crm-metadata.model.js";

const STAGE_LABELS = {
  new: "Nouveau",
  qualified: "Qualifie",
  visited: "Visite effectuee",
  proposal_sent: "Proposition envoyee",
  negotiation: "Negociation",
  won: "Gagne",
  lost: "Perdu"
};

const IMPORTANT_STAGE_TYPES = {
  negotiation: "crm.pipeline.negotiation",
  won: "crm.pipeline.won",
  lost: "crm.pipeline.lost"
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const buildPropertyAccessQuery = (actor) => {
  if (actor.role === "agency") {
    if (!actor.agencyId) throw new AppError("Agency context not found", StatusCodes.BAD_REQUEST);
    return { agencyId: actor.agencyId };
  }

  if (actor.role === "agency_agent") {
    if (actor.agencyId) {
      return { agencyId: actor.agencyId };
    }
    return { agentId: actor.id };
  }

  if (actor.role === "independent_agent") {
    return { agentId: actor.id };
  }

  throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
};

const buildDataUsed = (property) => {
  const data = ["Prix", "Localisation", "Photos", "Historique", "Score intelligent"];

  if (property.threeDUrl) data.push("Visite 3D");
  if (property.favoriteCount) data.push("Favoris");
  if (property.viewCount) data.push("Vues");

  return data;
};

const syncMetadataForProperties = async ({ actor, properties }) => {
  const metadataItems = [];

  for (const property of properties) {
    const metadata = await CrmMetadata.findOneAndUpdate(
      { propertyId: property._id },
      {
        $setOnInsert: {
          propertyId: property._id,
          pipelineStage: "new",
          status: "active",
          priority: property.score >= 80 ? "high" : property.score >= 50 ? "medium" : "low",
          createdBy: actor.id
        },
        $set: {
          agencyId: property.agencyId || null,
          agentId: property.agentId || null,
          dataUsed: buildDataUsed(property),
          updatedBy: actor.id
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("propertyId", "title slug address coverImage score scoreDetails status purpose type price currency")
      .populate("agentId", "firstName lastName email avatar score scoreDetails")
      .lean();

    metadataItems.push(metadata);
  }

  return metadataItems;
};

const mapMetadata = (metadata) => {
  const property = metadata.propertyId || {};
  const agent = metadata.agentId || {};
  const agentName = [agent.firstName, agent.lastName].filter(Boolean).join(" ").trim() || agent.email || "Agent non attribue";

  return {
    id: String(metadata._id),
    property: {
      id: property._id ? String(property._id) : String(metadata.propertyId || ""),
      title: property.title || "Bien non renseigne",
      slug: property.slug || "",
      address: property.address || "",
      coverImage: property.coverImage || null,
      score: property.score || 0,
      scoreDetails: property.scoreDetails || null,
      status: property.status || "",
      purpose: property.purpose || "",
      type: property.type || "",
      price: property.price || 0,
      currency: property.currency || "USD"
    },
    agent: {
      id: agent._id ? String(agent._id) : String(metadata.agentId || ""),
      fullName: agentName,
      email: agent.email || "",
      avatar: agent.avatar || null,
      score: agent.score || 0,
      scoreDetails: agent.scoreDetails || null
    },
    agencyId: metadata.agencyId ? String(metadata.agencyId) : null,
    pipelineStage: metadata.pipelineStage,
    pipelineLabel: STAGE_LABELS[metadata.pipelineStage] || metadata.pipelineStage,
    dataUsed: metadata.dataUsed || [],
    status: metadata.status,
    priority: metadata.priority,
    nextAction: metadata.nextAction || "",
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt
  };
};

const filterMetadata = (items, filters = {}) => items.filter((item) => {
  if (filters.stage && filters.stage !== "all" && item.pipelineStage !== filters.stage) {
    return false;
  }

  if (!filters.search) {
    return true;
  }

  const haystack = [
    item.property.title,
    item.property.address,
    item.agent.fullName,
    item.pipelineLabel,
    item.dataUsed.join(" ")
  ].map(normalizeText).join(" ");

  return haystack.includes(normalizeText(filters.search));
});

const assertMetadataAccess = async ({ metadata, actor }) => {
  if (actor.role === "independent_agent") {
    if (String(metadata.agentId || "") !== String(actor.id)) throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
    return;
  }

  if (actor.role === "agency" || actor.role === "agency_agent") {
    if (!actor.agencyId || String(metadata.agencyId || "") !== String(actor.agencyId)) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
    }
    return;
  }

  throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
};

const resolveNotificationRecipients = async ({ metadata, actor }) => {
  const recipients = new Set();

  if (metadata.agentId) recipients.add(String(metadata.agentId));

  if (metadata.agencyId) {
    const [agency, members] = await Promise.all([
      Agency.findById(metadata.agencyId).select("ownerUserId").lean(),
      AgencyMember.find({ agencyId: metadata.agencyId, status: "active" }).select("userId").lean()
    ]);

    if (agency?.ownerUserId) recipients.add(String(agency.ownerUserId));
    members.forEach((member) => recipients.add(String(member.userId)));
  }

  recipients.delete(String(actor.id));
  return [...recipients];
};

const createPipelineNotification = async ({ metadata, actor, previousStage }) => {
  const recipients = await resolveNotificationRecipients({ metadata, actor });
  if (!recipients.length) return;

  const propertyTitle = metadata.propertyId?.title || "un bien";
  const nextLabel = STAGE_LABELS[metadata.pipelineStage] || metadata.pipelineStage;
  const previousLabel = STAGE_LABELS[previousStage] || previousStage;
  const notificationType = IMPORTANT_STAGE_TYPES[metadata.pipelineStage] || "crm.pipeline.updated";

  await createNotifications(
    recipients.map((userId) => ({
      userId,
      type: notificationType,
      title: `Pipeline CRM: ${propertyTitle}`,
      body: `Le bien ${propertyTitle} est passe de ${previousLabel} a ${nextLabel}.`,
      channel: "in_app",
      data: {
        metadataId: metadata._id,
        propertyId: metadata.propertyId?._id || metadata.propertyId,
        propertyTitle,
        pipelineStage: metadata.pipelineStage,
        previousStage,
        actorId: actor.id,
        i18nKey: notificationType
      }
    }))
  );
};

const createMetadataUpdatedNotification = async ({ metadata, actor, changes }) => {
  const recipients = await resolveNotificationRecipients({ metadata, actor });
  if (!recipients.length || !changes.length) return;

  const propertyTitle = metadata.propertyId?.title || "un bien";
  await createNotifications(
    recipients.map((userId) => ({
      userId,
      type: "crm.metadata.updated",
      title: `Metadonnee CRM mise a jour: ${propertyTitle}`,
      body: `Les informations CRM de ${propertyTitle} ont ete mises a jour: ${changes.join(", ")}.`,
      channel: "in_app",
      data: {
        metadataId: metadata._id,
        propertyId: metadata.propertyId?._id || metadata.propertyId,
        propertyTitle,
        changes,
        actorId: actor.id,
        i18nKey: "crm.metadata.updated"
      }
    }))
  );
};

export const listCrmMetadata = async ({ actor, filters = {} }) => {
  const accessQuery = buildPropertyAccessQuery(actor);
  const properties = await Property.find(accessQuery)
    .select("title slug address coverImage score scoreDetails status purpose type price currency agentId agencyId threeDUrl favoriteCount viewCount updatedAt")
    .sort({ updatedAt: -1, score: -1 })
    .limit(200)
    .lean();

  const metadata = await syncMetadataForProperties({ actor, properties });
  const items = filterMetadata(metadata.map(mapMetadata), filters);

  return {
    items,
    stages: CRM_PIPELINE_STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] })),
    summary: {
      total: items.length,
      active: items.filter((item) => item.status === "active").length,
      negotiation: items.filter((item) => item.pipelineStage === "negotiation").length,
      won: items.filter((item) => item.pipelineStage === "won").length,
      lost: items.filter((item) => item.pipelineStage === "lost").length
    }
  };
};

export const updateCrmPipelineStage = async ({ actor, metadataId, payload }) => {
  const metadata = await CrmMetadata.findById(metadataId).populate("propertyId", "title slug");
  if (!metadata) throw new AppError("CRM metadata not found", StatusCodes.NOT_FOUND);

  await assertMetadataAccess({ metadata, actor });

  const previousStage = metadata.pipelineStage;
  const previousPriority = metadata.priority;
  const previousNextAction = metadata.nextAction || "";
  metadata.pipelineStage = payload.pipelineStage;
  metadata.nextAction = payload.nextAction ?? metadata.nextAction;
  if (payload.priority) metadata.priority = payload.priority;
  metadata.status = ["won", "lost"].includes(payload.pipelineStage) ? "closed" : "active";
  metadata.updatedBy = actor.id;
  await metadata.save();

  if (previousStage !== metadata.pipelineStage) {
    await createPipelineNotification({ metadata, actor, previousStage });
  } else {
    const metadataChanges = [];
    if (payload.priority && previousPriority !== metadata.priority) metadataChanges.push("priorite");
    if (payload.nextAction !== undefined && previousNextAction !== (metadata.nextAction || "")) metadataChanges.push("prochaine action");
    await createMetadataUpdatedNotification({ metadata, actor, changes: metadataChanges });
  }

  const populated = await CrmMetadata.findById(metadata._id)
    .populate("propertyId", "title slug address coverImage score scoreDetails status purpose type price currency")
    .populate("agentId", "firstName lastName email avatar score scoreDetails")
    .lean();

  return mapMetadata(populated);
};
