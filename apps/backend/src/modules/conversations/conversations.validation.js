import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/u, "Invalid object id");
const appointmentTimeSchema = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/u, "Time must use a 30-minute slot");
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
    messageType: z.enum(["text", "image", "file", "appointment"]).default("text"),
    attachments: z.array(z.string().url()).default([]),
    appointment: appointmentPayloadSchema.nullable().optional()
  }).superRefine((value, context) => {
    if (value.messageType === "appointment" && !value.appointment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointment"],
        message: "Appointment payload is required for appointment messages"
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
    messageType: z.enum(["text", "image", "file", "appointment"]).optional(),
    appointment: appointmentPayloadSchema.nullable().optional()
  }).superRefine((value, context) => {
    if (value.messageType === "appointment" && !value.appointment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointment"],
        message: "Appointment payload is required for appointment messages"
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
