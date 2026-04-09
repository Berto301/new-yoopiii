import { z } from "zod";

const uploadPathSchema = z.string().trim().min(1).refine((value) => /^https?:\/\//u.test(value) || value.startsWith("/uploads/"), {
  message: "Chemin de fichier invalide"
});

const requiredLabel = "Ce champ est requis";

export const operationTypeOptions = [
  { value: "sale", label: "Vente", description: "Le client est positionne sur un achat." },
  { value: "rent", label: "Location", description: "Le client recherche une location." }
];

export const visibilityOptions = [
  { value: "private", label: "Prive", description: "Visible uniquement par l'auteur et les admins." },
  { value: "team", label: "Equipe", description: "Visible par l'equipe commerciale." }
];

export const directionOptions = [
  { value: "outbound", label: "Sortant", description: "Interaction initiee par l'agence." },
  { value: "inbound", label: "Entrant", description: "Interaction initiee par le client." }
];

export const visitInterestOptions = [
  { value: "high", label: "Interet fort", description: "Le client se projette rapidement." },
  { value: "medium", label: "Interet moyen", description: "Le client compare encore plusieurs options." },
  { value: "low", label: "Interet faible", description: "Le client n'est pas encore decide." }
];

export const communicationToneOptions = [
  { value: "positive", label: "Positif", description: "Echange constructif et ouvert." },
  { value: "neutral", label: "Neutre", description: "Echange factuel, peu d'emotion exprimee." },
  { value: "negative", label: "Reserve", description: "Le client exprime des freins ou une frustration." }
];

export const followUpActionOptions = [
  { value: "call_back", label: "Relancer par appel" },
  { value: "send_offer", label: "Envoyer une offre" },
  { value: "schedule_visit", label: "Planifier une visite" },
  { value: "send_documents", label: "Envoyer des documents" },
  { value: "wait_client", label: "Attendre le retour client" }
];

export const pipelineStatusOptions = [
  { value: "new_lead", label: "Nouveau lead" },
  { value: "qualified", label: "Qualifie" },
  { value: "visit_scheduled", label: "Visite planifiee" },
  { value: "proposal_sent", label: "Proposition envoyee" },
  { value: "negotiation", label: "Negociation" },
  { value: "won", label: "Gagne" },
  { value: "lost", label: "Perdu" }
];

export const clientTypeOptions = [
  { value: "buyer", label: "Acheteur" },
  { value: "tenant", label: "Locataire" },
  { value: "investor", label: "Investisseur" },
  { value: "owner", label: "Proprietaire" }
];

export const interestLevelOptions = [
  { value: "hot", label: "Tres chaud" },
  { value: "warm", label: "Chaud" },
  { value: "cold", label: "Froid" }
];

export const channelOptions = [
  { value: "phone", label: "Telephone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "in_person", label: "En personne" }
];

export const priorityOptions = [
  { value: "low", label: "Basse" },
  { value: "medium", label: "Moyenne" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" }
];

export const leadSourceOptions = [
  { value: "portal", label: "Portail immobilier" },
  { value: "social", label: "Reseaux sociaux" },
  { value: "referral", label: "Recommandation" },
  { value: "walkin", label: "Passage agence" },
  { value: "website", label: "Site web" }
];

export const perceptionPriceOptions = [
  { value: "fair", label: "Prix coherent" },
  { value: "high", label: "Prix eleve" },
  { value: "very_high", label: "Prix tres eleve" },
  { value: "good_value", label: "Bon rapport qualite/prix" }
];

export const locationAppreciationOptions = [
  { value: "excellent", label: "Excellente" },
  { value: "good", label: "Bonne" },
  { value: "average", label: "Moyenne" },
  { value: "poor", label: "Faible" }
];

export const communicationResultOptions = [
  { value: "qualified", label: "Lead qualifie" },
  { value: "follow_up", label: "Relance necessaire" },
  { value: "visit_booked", label: "Visite planifiee" },
  { value: "proposal_sent", label: "Proposition envoyee" },
  { value: "lost", label: "Perdu" }
];

export const propertyTypeLabelMap = {
  sale: "Vente",
  rent: "Location"
};

export const visitReportSchema = z.object({
  propertyId: z.string().trim().optional().or(z.literal("")),
  propertyTitle: z.string().trim().min(1, requiredLabel),
  visitDate: z.string().trim().min(1, requiredLabel),
  visitTime: z.string().trim().min(1, requiredLabel),
  agentResponsibleId: z.string().trim().min(1, requiredLabel),
  agentResponsibleName: z.string().trim().min(1, requiredLabel),
  operationType: z.enum(["sale", "rent"]),
  clientFullName: z.string().trim().min(1, requiredLabel),
  clientPhone: z.string().trim().min(1, requiredLabel),
  clientEmail: z.string().trim().email("Email invalide").or(z.literal("")),
  clientType: z.string().trim().min(1, requiredLabel),
  interestStatus: z.string().trim().min(1, requiredLabel),
  estimatedBudget: z.coerce.number().min(0, "Budget invalide"),
  clientNeed: z.string().trim().min(1, requiredLabel),
  attendees: z.string().trim().min(1, requiredLabel),
  durationMinutes: z.coerce.number().int().min(1, "Duree invalide"),
  positivePoints: z.string().trim().min(1, requiredLabel),
  negativePoints: z.string().trim().min(1, requiredLabel),
  objections: z.string().trim().min(1, requiredLabel),
  pricePerception: z.string().trim().min(1, requiredLabel),
  locationAppreciation: z.string().trim().min(1, requiredLabel),
  followUpPlanned: z.boolean().default(false),
  followUpDate: z.string().trim().optional(),
  nextAction: z.string().trim().min(1, requiredLabel),
  conversionProbability: z.coerce.number().min(0).max(100),
  pipelineStatus: z.string().trim().min(1, requiredLabel),
  agentComment: z.string().trim().min(1, requiredLabel),
  recommendations: z.string().trim().min(1, requiredLabel),
  tags: z.string().trim().default(""),
  attachments: z.array(uploadPathSchema).default([])
}).superRefine((value, context) => {
  if (value.followUpPlanned && !value.followUpDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["followUpDate"],
      message: "Veuillez renseigner la date de relance"
    });
  }
});

export const communicationReportSchema = z.object({
  clientFullName: z.string().trim().min(1, requiredLabel),
  propertyId: z.string().trim().optional().or(z.literal("")),
  propertyTitle: z.string().trim().default(""),
  agentResponsibleId: z.string().trim().min(1, requiredLabel),
  agentResponsibleName: z.string().trim().min(1, requiredLabel),
  communicationDate: z.string().trim().min(1, requiredLabel),
  communicationTime: z.string().trim().min(1, requiredLabel),
  channel: z.string().trim().min(1, requiredLabel),
  direction: z.string().trim().min(1, requiredLabel),
  durationMinutes: z.coerce.number().int().min(0),
  subject: z.string().trim().min(1, requiredLabel),
  summary: z.string().trim().min(1, requiredLabel),
  detailedContent: z.string().trim().min(1, requiredLabel),
  clientTone: z.string().trim().min(1, requiredLabel),
  interestLevel: z.string().trim().min(1, requiredLabel),
  interactionResult: z.string().trim().min(1, requiredLabel),
  nextAction: z.string().trim().min(1, requiredLabel),
  nextActionDate: z.string().trim().optional(),
  priority: z.string().trim().min(1, requiredLabel),
  attachments: z.array(uploadPathSchema).default([]),
  externalLink: z.string().trim().url("Lien invalide").or(z.literal("")),
  visibility: z.enum(["private", "team"]),
  tags: z.string().trim().default(""),
  internalNote: z.string().trim().min(1, requiredLabel),
  leadSource: z.string().trim().min(1, requiredLabel),
  pipelineStage: z.string().trim().min(1, requiredLabel),
  lossReason: z.string().trim().default(""),
  leadScore: z.coerce.number().min(0).max(100)
}).superRefine((value, context) => {
  if (value.interactionResult === "lost" && !value.lossReason.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lossReason"],
      message: "Veuillez preciser la raison de perte"
    });
  }
});

export const getVisitReportDefaultValues = ({ user, participant, propertyOption, report } = {}) => ({
  propertyId: report?.propertyId || propertyOption?.value || "",
  propertyTitle: report?.propertyTitle || propertyOption?.label || "",
  visitDate: report?.visitDate || new Date().toISOString().slice(0, 10),
  visitTime: report?.visitTime || "10:00",
  agentResponsibleId: report?.agentResponsibleId || user?.id || "",
  agentResponsibleName: report?.agentResponsibleName || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "",
  operationType: report?.operationType || propertyOption?.purpose || "sale",
  clientFullName: report?.clientFullName || [participant?.firstName, participant?.lastName].filter(Boolean).join(" ").trim() || participant?.email || "",
  clientPhone: report?.clientPhone || participant?.phone || "",
  clientEmail: report?.clientEmail || participant?.email || "",
  clientType: report?.clientType || "buyer",
  interestStatus: report?.interestStatus || "medium",
  estimatedBudget: report?.estimatedBudget || 0,
  clientNeed: report?.clientNeed || "",
  attendees: report?.attendees || "",
  durationMinutes: report?.durationMinutes || 30,
  positivePoints: report?.positivePoints || "",
  negativePoints: report?.negativePoints || "",
  objections: report?.objections || "",
  pricePerception: report?.pricePerception || "fair",
  locationAppreciation: report?.locationAppreciation || "good",
  followUpPlanned: report?.followUpPlanned || false,
  followUpDate: report?.followUpDate || "",
  nextAction: report?.nextAction || "call_back",
  conversionProbability: report?.conversionProbability ?? 50,
  pipelineStatus: report?.pipelineStatus || "visit_scheduled",
  agentComment: report?.agentComment || "",
  recommendations: report?.recommendations || "",
  tags: Array.isArray(report?.tags) ? report.tags.join(", ") : report?.tags || "",
  attachments: report?.attachments || []
});

export const getCommunicationReportDefaultValues = ({ user, participant, propertyOption, report } = {}) => ({
  clientFullName: report?.clientFullName || [participant?.firstName, participant?.lastName].filter(Boolean).join(" ").trim() || participant?.email || "",
  propertyId: report?.propertyId || propertyOption?.value || "",
  propertyTitle: report?.propertyTitle || propertyOption?.label || "",
  agentResponsibleId: report?.agentResponsibleId || user?.id || "",
  agentResponsibleName: report?.agentResponsibleName || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "",
  communicationDate: report?.communicationDate || new Date().toISOString().slice(0, 10),
  communicationTime: report?.communicationTime || "10:00",
  channel: report?.channel || "phone",
  direction: report?.direction || "outbound",
  durationMinutes: report?.durationMinutes || 10,
  subject: report?.subject || "",
  summary: report?.summary || "",
  detailedContent: report?.detailedContent || "",
  clientTone: report?.clientTone || "neutral",
  interestLevel: report?.interestLevel || "warm",
  interactionResult: report?.interactionResult || "follow_up",
  nextAction: report?.nextAction || "call_back",
  nextActionDate: report?.nextActionDate || "",
  priority: report?.priority || "medium",
  attachments: report?.attachments || [],
  externalLink: report?.externalLink || "",
  visibility: report?.visibility || "team",
  tags: Array.isArray(report?.tags) ? report.tags.join(", ") : report?.tags || "",
  internalNote: report?.internalNote || "",
  leadSource: report?.leadSource || "portal",
  pipelineStage: report?.pipelineStage || "qualified",
  lossReason: report?.lossReason || "",
  leadScore: report?.leadScore ?? 50
});

export const normalizeTags = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
