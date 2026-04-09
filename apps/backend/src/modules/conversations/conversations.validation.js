import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/u, "Invalid object id");
const appointmentTimeSchema = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/u, "Time must use a 30-minute slot");
const attachmentPathSchema = z.string().trim().min(1).refine((value) => /^https?:\/\//u.test(value) || value.startsWith("/uploads/"), {
  message: "Attachment must be a public URL or an uploaded file path"
});
const numberFromQuery = (fieldName) =>
  z.coerce.number({
    invalid_type_error: `${fieldName} must be a number`
  });

const appointmentPayloadSchema = z.object({
  appointmentId: z.string().trim().min(1).max(100),
  propertyId: objectIdSchema.nullable().optional(),
  propertyTitle: z.string().trim().min(1).max(200),
  propertyPurpose: z.enum(["sale", "rent"]).nullable().optional(),
  conversationId: objectIdSchema.optional(),
  clientId: objectIdSchema,
  agentId: objectIdSchema,
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "closed_won"]).default("pending"),
  date: z.string().trim().min(1).max(50),
  startTime: appointmentTimeSchema,
  endTime: appointmentTimeSchema,
  visitFee: z.coerce.number().min(0),
  description: z.string().trim().max(2000).default(""),
  clientFeedback: z.string().trim().max(2000).default(""),
  clientTakesProperty: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: objectIdSchema,
  updatedBy: objectIdSchema
});

const visitReportPayloadSchema = z.object({
  propertyId: objectIdSchema.optional().nullable().or(z.literal("")),
  propertyTitle: z.string().trim().min(1).max(200),
  visitDate: z.string().trim().min(1).max(50),
  visitTime: z.string().trim().min(1).max(20),
  agentResponsibleId: objectIdSchema,
  agentResponsibleName: z.string().trim().min(1).max(200),
  operationType: z.enum(["sale", "rent"]),
  clientFullName: z.string().trim().min(1).max(200),
  clientPhone: z.string().trim().min(1).max(50),
  clientEmail: z.string().trim().email().or(z.literal("")),
  clientType: z.string().trim().min(1).max(100),
  interestStatus: z.string().trim().min(1).max(100),
  estimatedBudget: z.coerce.number().min(0),
  clientNeed: z.string().trim().min(1).max(3000),
  attendees: z.string().trim().min(1).max(500),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  positivePoints: z.string().trim().min(1).max(3000),
  negativePoints: z.string().trim().min(1).max(3000),
  objections: z.string().trim().min(1).max(3000),
  pricePerception: z.string().trim().min(1).max(100),
  locationAppreciation: z.string().trim().min(1).max(100),
  followUpPlanned: z.boolean().default(false),
  followUpDate: z.string().trim().optional().default(""),
  nextAction: z.string().trim().min(1).max(200),
  conversionProbability: z.coerce.number().min(0).max(100),
  pipelineStatus: z.string().trim().min(1).max(100),
  agentComment: z.string().trim().min(1).max(3000),
  recommendations: z.string().trim().min(1).max(3000),
  tags: z.array(z.string().trim().min(1).max(100)).default([]),
  attachments: z.array(attachmentPathSchema).default([])
}).superRefine((value, context) => {
  if (value.followUpPlanned && !value.followUpDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["followUpDate"],
      message: "Follow-up date is required when follow-up is planned"
    });
  }
});

const communicationReportPayloadSchema = z.object({
  clientFullName: z.string().trim().min(1).max(200),
  propertyId: objectIdSchema.optional().nullable().or(z.literal("")),
  propertyTitle: z.string().trim().max(200).default(""),
  agentResponsibleId: objectIdSchema,
  agentResponsibleName: z.string().trim().min(1).max(200),
  communicationDate: z.string().trim().min(1).max(50),
  communicationTime: z.string().trim().min(1).max(20),
  channel: z.string().trim().min(1).max(100),
  direction: z.string().trim().min(1).max(100),
  durationMinutes: z.coerce.number().int().min(0).max(1440),
  subject: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(3000),
  detailedContent: z.string().trim().min(1).max(5000),
  clientTone: z.string().trim().min(1).max(100),
  interestLevel: z.string().trim().min(1).max(100),
  interactionResult: z.string().trim().min(1).max(100),
  nextAction: z.string().trim().min(1).max(200),
  nextActionDate: z.string().trim().optional().default(""),
  priority: z.string().trim().min(1).max(50),
  attachments: z.array(attachmentPathSchema).default([]),
  externalLink: z.string().trim().url().or(z.literal("")),
  visibility: z.enum(["private", "team"]),
  tags: z.array(z.string().trim().min(1).max(100)).default([]),
  internalNote: z.string().trim().min(1).max(3000),
  leadSource: z.string().trim().min(1).max(100),
  pipelineStage: z.string().trim().min(1).max(100),
  lossReason: z.string().trim().max(1000).default(""),
  leadScore: z.coerce.number().min(0).max(100)
}).superRefine((value, context) => {
  if (value.interactionResult === "lost" && !value.lossReason.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lossReason"],
      message: "Loss reason is required for lost interactions"
    });
  }
});

export const createConversationSchema = z.object({
  body: z.object({
    participantId: objectIdSchema,
    propertyId: objectIdSchema.optional()
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const conversationIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    conversationId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const conversationParticipantParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    participantId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const conversationMessagesQuerySchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    conversationId: objectIdSchema
  }),
  query: z.object({
    page: numberFromQuery("page").min(1).default(1),
    limit: numberFromQuery("limit").min(1).max(100).default(30)
  })
});

export const createMessageSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1).max(5000),
    messageType: z.enum(["text", "image", "file", "appointment", "communication_report", "visit_report"]).default("text"),
    attachments: z.array(attachmentPathSchema).default([]),
    appointment: appointmentPayloadSchema.nullable().optional(),
    communicationReport: communicationReportPayloadSchema.nullable().optional(),
    visitReport: visitReportPayloadSchema.nullable().optional()
  }).superRefine((value, context) => {
    if (value.messageType === "appointment" && !value.appointment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointment"],
        message: "Appointment payload is required for appointment messages"
      });
    }

    if (value.messageType === "communication_report" && !value.communicationReport) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["communicationReport"],
        message: "Communication report payload is required"
      });
    }

    if (value.messageType === "visit_report" && !value.visitReport) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visitReport"],
        message: "Visit report payload is required"
      });
    }
  }),
  params: z.object({
    conversationId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const updateMessageSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1).max(5000),
    messageType: z.enum(["text", "image", "file", "appointment", "communication_report", "visit_report"]).optional(),
    attachments: z.array(attachmentPathSchema).optional(),
    appointment: appointmentPayloadSchema.nullable().optional(),
    communicationReport: communicationReportPayloadSchema.nullable().optional(),
    visitReport: visitReportPayloadSchema.nullable().optional()
  }).superRefine((value, context) => {
    if (value.messageType === "appointment" && !value.appointment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointment"],
        message: "Appointment payload is required for appointment messages"
      });
    }

    if (value.messageType === "communication_report" && !value.communicationReport) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["communicationReport"],
        message: "Communication report payload is required"
      });
    }

    if (value.messageType === "visit_report" && !value.visitReport) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visitReport"],
        message: "Visit report payload is required"
      });
    }
  }),
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const messageParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema
  }),
  query: z.object({}).default({})
});
