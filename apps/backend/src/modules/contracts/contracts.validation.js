import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const contractStatusSchema = z.enum(["draft", "pending_signature", "signed", "accepted", "active", "suspended", "expired", "terminated"]);
const managerRoleSchema = z.enum(["agency", "independent_agent"]);
const documentKindSchema = z.enum([
  "contract_signed",
  "owner_identity",
  "agent_identity",
  "agency_documents",
  "property_document",
  "annex",
  "legal_document"
]);

const optionalDateInputSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.coerce.date().nullable().optional());

const requiredDateInputSchema = z.coerce.date();

const contractPayloadSchema = z.object({
  reference: z.string().trim().min(3).max(120),
  contractType: z.string().trim().min(2).max(120),
  status: contractStatusSchema,
  signatureDate: optionalDateInputSchema,
  startDate: requiredDateInputSchema,
  endDate: requiredDateInputSchema,
  renewalDate: optionalDateInputSchema,
  ownerUserId: objectIdSchema,
  managerRole: managerRoleSchema.optional(),
  agencyId: objectIdSchema.nullish(),
  managerUserId: objectIdSchema.nullish(),
  responsibleAgentUserId: objectIdSchema.nullish(),
  mandateType: z.string().trim().max(120).default(""),
  propertyIds: z.array(objectIdSchema).default([]),
  mission: z.string().trim().max(5000).default(""),
  commission: z.string().trim().max(255).default(""),
  paymentConditions: z.string().trim().max(5000).default(""),
  noticePeriod: z.string().trim().max(255).default(""),
  terminationConditions: z.string().trim().max(5000).default(""),
  specialClauses: z.string().trim().max(5000).default(""),
  legalFramework: z.string().trim().max(5000).default(""),
  jurisdiction: z.string().trim().max(255).default(""),
  propertyReference: z.string().trim().max(255).default(""),
  documentIds: z.array(objectIdSchema).default([])
});

export const contractCollectionSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: contractStatusSchema.optional()
  }).default({})
});

export const contractIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    contractId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const createContractSchema = z.object({
  body: contractPayloadSchema,
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const updateContractSchema = z.object({
  body: contractPayloadSchema.partial(),
  params: z.object({
    contractId: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const contractUploadSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    kind: documentKindSchema,
    contractId: objectIdSchema.optional()
  })
});

export const contractOwnerOptionsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const contractRelatedOptionsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});
