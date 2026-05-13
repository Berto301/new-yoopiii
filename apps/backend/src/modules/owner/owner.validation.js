import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const genderSchema = z.enum(["homme", "femme", "autre"]);

const maintenancePrioritySchema = z.enum(["high", "medium", "low"]);
const maintenanceStatusSchema = z.enum(["planned", "in_progress", "closed"]);
const paymentMethodSchema = z.enum(["cash", "bank_transfer", "mobile_money", "card", "check", "other", ""]);
const paymentStatusSchema = z.enum(["pending", "pending_approval", "approved", "paid", "late", "rejected", "cancelled"]);

const nullableObjectIdSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, objectIdSchema.nullable());

const maintenanceTicketBodySchema = z.object({
  managedPropertyId: objectIdSchema,
  propertyId: nullableObjectIdSchema.optional().default(null),
  propertyLabel: z.string().trim().max(255).default(""),
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().max(5000).default(""),
  priority: maintenancePrioritySchema.default("medium"),
  assignee: z.string().trim().max(255).default(""),
  status: maintenanceStatusSchema.default("planned"),
  maintenanceAmount: z.coerce.number().min(0).default(0),
  currency: z.string().trim().min(2).max(8).transform((value) => value.toUpperCase()).default("USD"),
  lastUpdateAt: z.coerce.date()
});

export const maintenanceTicketParamsSchema = z.object({
  params: z.object({
    ticketId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const createOwnerMaintenanceTicketSchema = z.object({
  body: maintenanceTicketBodySchema,
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const updateOwnerMaintenanceTicketSchema = z.object({
  body: maintenanceTicketBodySchema,
  params: z.object({
    ticketId: objectIdSchema
  }),
  query: z.object({}).optional().default({})
});

const tenantBodySchema = z.object({
  linkedUserId: nullableObjectIdSchema.optional().default(null),
  managedPropertyId: objectIdSchema,
  managementContractId: nullableObjectIdSchema.optional().default(null),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).default(""),
  cin: z.string().trim().max(120).default(""),
  adresse: z.string().trim().max(255).default(""),
  sexe: genderSchema,
  documentsCount: z.coerce.number().min(0).default(0),
  paymentHistoryLabel: z.string().trim().max(255).default("")
});

export const ownerTenantParamsSchema = z.object({
  params: z.object({
    tenantId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const ownerPropertyParamsSchema = z.object({
  params: z.object({
    propertyId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const ownerPropertyPaymentParamsSchema = z.object({
  params: z.object({
    propertyId: objectIdSchema,
    paymentId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const ownerPropertyFeedbackParamsSchema = z.object({
  params: z.object({
    propertyId: objectIdSchema,
    feedbackId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

const rentPaymentBodySchema = z.object({
  managedPropertyId: objectIdSchema,
  tenantId: objectIdSchema,
  managementContractId: nullableObjectIdSchema.optional().default(null),
  dueDate: z.coerce.date(),
  amount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0),
  currency: z.string().trim().min(2).max(8).transform((value) => value.toUpperCase()).default("USD"),
  status: paymentStatusSchema.optional().default("pending_approval"),
  paymentDate: z.coerce.date().optional().nullable().default(null),
  paymentMethod: paymentMethodSchema.default(""),
  paymentReference: z.string().trim().max(160).default(""),
  proofUrl: z.string().trim().max(1000).default(""),
  proofName: z.string().trim().max(255).default(""),
  note: z.string().trim().max(2000).default("")
});

export const createOwnerRentPaymentSchema = z.object({
  body: rentPaymentBodySchema,
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const updateOwnerRentPaymentSchema = z.object({
  body: rentPaymentBodySchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  params: z.object({
    paymentId: objectIdSchema
  }),
  query: z.object({}).optional().default({})
});

export const ownerRentPaymentParamsSchema = z.object({
  params: z.object({
    paymentId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const createOwnerTenantSchema = z.object({
  body: tenantBodySchema,
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const updateOwnerTenantSchema = z.object({
  body: tenantBodySchema,
  params: z.object({
    tenantId: objectIdSchema
  }),
  query: z.object({}).optional().default({})
});
