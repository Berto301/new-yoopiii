import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const contractStatusSchema = z.enum(["draft", "pending_signature", "signed", "accepted", "active", "suspended", "expired", "terminated"]);
const managerRoleSchema = z.enum(["agency", "independent_agent"]);
const contractTypeSchema = z.string().trim().min(2).max(120);
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

const nullableObjectIdSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, objectIdSchema.nullable());

const optionalNumberSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.coerce.number().finite().min(0).optional());

const requiredNumberSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return value;
}, z.coerce.number().finite().min(0));

const nullableDateInputSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.coerce.date().nullable());

const tenantPayloadSchema = z.object({
  tenantId: nullableObjectIdSchema.optional().default(null),
  fullName: z.string().trim().max(255).default(""),
  phone: z.string().trim().max(120).default(""),
  email: z.string().trim().max(255).default(""),
  isMainTenant: z.boolean().default(false)
});

const financialPayloadSchema = z.object({
  rentAmount: requiredNumberSchema,
  charges: optionalNumberSchema.default(0),
  deposit: optionalNumberSchema.default(0),
  currency: z.string().trim().min(1).max(12).transform((value) => value.toUpperCase()),
  paymentFrequency: z.string().trim().min(1).max(50),
  paymentMethod: z.string().trim().max(120).default("")
});

const distributionPayloadSchema = z.object({
  ownerShare: optionalNumberSchema.default(0),
  agencyShare: optionalNumberSchema.default(0)
});

const paymentTrackingPayloadSchema = z.object({
  status: z.string().trim().max(120).default(""),
  lastPaymentDate: nullableDateInputSchema.optional().default(null),
  nextPaymentDate: nullableDateInputSchema.optional().default(null)
});

const documentsPayloadSchema = z.object({
  contractFile: z.string().trim().max(2000).default(""),
  attachments: z.array(z.string().trim().max(2000)).default([])
});

const actionsPayloadSchema = z.object({
  canPublishProperty: z.boolean().default(true),
  canReserveProperty: z.boolean().default(true),
  canEditProperty: z.boolean().default(false),
  canDeleteProperty: z.boolean().default(false),
  publicationOwnerDisplay: z.object({
    showOwnerName: z.boolean().default(false),
    showOwnerContact: z.boolean().default(false),
    allowDirectOwnerChat: z.boolean().default(false)
  }).default({})
});

const defaultFinancialValue = {
  rentAmount: 0,
  charges: 0,
  deposit: 0,
  currency: "USD",
  paymentFrequency: "monthly",
  paymentMethod: ""
};

const contractPayloadBaseSchema = z.object({
  reference: z.string().trim().min(3).max(120),
  contractType: contractTypeSchema,
  status: contractStatusSchema,
  signatureDate: optionalDateInputSchema,
  startDate: requiredDateInputSchema,
  endDate: requiredDateInputSchema,
  renewalDate: optionalDateInputSchema,
  ownerUserId: objectIdSchema,
  managerRole: managerRoleSchema.optional(),
  agencyId: nullableObjectIdSchema.optional(),
  managerUserId: nullableObjectIdSchema.optional(),
  responsibleAgentUserId: objectIdSchema.nullish(),
  propertyId: nullableObjectIdSchema.optional(),
  agentId: nullableObjectIdSchema.optional(),
  agency: z
    .object({
      id: nullableObjectIdSchema.optional().default(null),
      name: z.string().trim().max(255).default(""),
      commission: optionalNumberSchema.default(0),
      fees: optionalNumberSchema.default(0)
    })
    .optional()
    .default({}),
  agent: z
    .object({
      id: nullableObjectIdSchema.optional().default(null),
      name: z.string().trim().max(255).default(""),
      commission: optionalNumberSchema.default(0),
      fees: optionalNumberSchema.default(0)
    })
    .optional()
    .default({}),
  tenants: z.array(tenantPayloadSchema).default([]),
  renewable: z.boolean().default(false),
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
  financial: financialPayloadSchema.optional().default(defaultFinancialValue),
  distribution: distributionPayloadSchema.default({}),
  paymentTracking: paymentTrackingPayloadSchema.default({}),
  documents: documentsPayloadSchema.default({}),
  actions: actionsPayloadSchema.default({}),
  notes: z.string().trim().max(5000).default(""),
  terms: z.string().trim().max(5000).default(""),
  documentIds: z.array(objectIdSchema).default([])
});

const validateTenants = (payload, ctx) => {
  if (!payload.tenants?.length) {
    return;
  }

  const hasMainTenant = payload.tenants.some((tenant) => tenant.isMainTenant);

  if (!hasMainTenant) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tenants"],
      message: "At least one main tenant is required"
    });
  }

  payload.tenants.forEach((tenant, index) => {
    if (!tenant.tenantId && !tenant.fullName.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tenants", index, "fullName"],
        message: "Tenant name is required"
      });
    }
  });
};

const contractPayloadSchema = contractPayloadBaseSchema.superRefine((payload, ctx) => {
  if (payload.endDate <= payload.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after start date"
    });
  }

  if (payload.contractType === "agency" && !payload.agencyId && !payload.agency?.id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["agencyId"],
      message: "Agency is required"
    });
  }

  if (payload.contractType === "agent" && !payload.managerUserId && !payload.agentId && !payload.agent?.id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["agentId"],
      message: "Agent is required"
    });
  }

  validateTenants(payload, ctx);
});

const partialContractPayloadSchema = contractPayloadBaseSchema.partial().superRefine((payload, ctx) => {
  if (payload.startDate && payload.endDate && payload.endDate <= payload.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after start date"
    });
  }

  if (payload.contractType === "agency" && payload.agencyId === null && payload.agency?.id === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["agencyId"],
      message: "Agency is required"
    });
  }

  if (payload.contractType === "agent" && payload.managerUserId === null && payload.agentId === null && payload.agent?.id === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["agentId"],
      message: "Agent is required"
    });
  }

  validateTenants(payload, ctx);
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
  body: partialContractPayloadSchema,
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
