import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/u, "Invalid object id");
const numberFromQuery = (fieldName) =>
  z.coerce.number({
    invalid_type_error: `${fieldName} must be a number`
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
    messageType: z.enum(["text", "image", "file"]).default("text"),
    attachments: z.array(z.string().url()).default([])
  }),
  params: z.object({
    conversationId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const readMessageSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    conversationId: objectIdSchema,
    messageId: objectIdSchema
  }),
  query: z.object({}).default({})
});
