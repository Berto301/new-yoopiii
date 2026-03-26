import { z } from "zod";
import { AGENCY_MEMBER_ROLES, AGENCY_PERMISSIONS } from "./constants/agency-permissions.js";

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/u, "Invalid object id");
const numberFromQuery = (fieldName) =>
  z.coerce.number({
    invalid_type_error: `${fieldName} must be a number`
  });

const permissionValues = Object.values(AGENCY_PERMISSIONS);
const permissionSchema = z.string().refine((value) => permissionValues.includes(value), {
  message: "Invalid agency permission"
});

export const agencyIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ agencyId: objectIdSchema }),
  query: z.object({}).default({})
});

export const createAgencyMemberSchema = z.object({
  body: z.object({
    userId: objectIdSchema,
    role: z.enum(AGENCY_MEMBER_ROLES),
    permissions: z.array(permissionSchema).default([]),
    jobTitle: z.string().max(120).optional()
  }),
  params: z.object({ agencyId: objectIdSchema }),
  query: z.object({}).default({})
});

export const updateAgencyMemberSchema = z.object({
  body: z.object({
    role: z.enum(AGENCY_MEMBER_ROLES).optional(),
    permissions: z.array(permissionSchema).optional(),
    status: z.enum(["invited", "active", "inactive", "removed"]).optional(),
    jobTitle: z.string().max(120).optional()
  }),
  params: z.object({ agencyId: objectIdSchema, memberId: objectIdSchema }),
  query: z.object({}).default({})
});

export const createRoleTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    key: z.string().min(2).max(80),
    permissions: z.array(permissionSchema).min(1),
    isSystem: z.boolean().optional()
  }),
  params: z.object({ agencyId: objectIdSchema }),
  query: z.object({}).default({})
});

export const updateRoleTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    permissions: z.array(permissionSchema).optional()
  }),
  params: z.object({ agencyId: objectIdSchema, roleId: objectIdSchema }),
  query: z.object({}).default({})
});

export const listCalendarEventsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ agencyId: objectIdSchema }),
  query: z.object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    page: numberFromQuery("page").min(1).default(1),
    limit: numberFromQuery("limit").min(1).max(100).default(30)
  })
});

export const createCalendarEventSchema = z.object({
  body: z.object({
    agentId: objectIdSchema.optional(),
    propertyId: objectIdSchema.optional(),
    bookingId: objectIdSchema.optional(),
    title: z.string().min(2).max(150),
    description: z.string().max(1000).optional(),
    type: z.enum(["visit", "meeting", "follow_up", "internal", "blocked_slot"]),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    status: z.enum(["scheduled", "confirmed", "cancelled", "completed"]).optional()
  }),
  params: z.object({ agencyId: objectIdSchema }),
  query: z.object({}).default({})
});

export const updateCalendarEventSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(150).optional(),
    description: z.string().max(1000).optional(),
    type: z.enum(["visit", "meeting", "follow_up", "internal", "blocked_slot"]).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    status: z.enum(["scheduled", "confirmed", "cancelled", "completed"]).optional()
  }),
  params: z.object({ agencyId: objectIdSchema, eventId: objectIdSchema }),
  query: z.object({}).default({})
});

export const createExpenseSchema = z.object({
  body: z.object({
    label: z.string().min(2).max(150),
    category: z.enum(["marketing", "transport", "salary", "office", "legal", "maintenance", "other"]),
    amount: z.coerce.number().min(0),
    currency: z.string().min(3).max(5).optional(),
    expenseDate: z.string().datetime(),
    notes: z.string().max(2000).optional(),
    attachments: z.array(z.string().url()).default([])
  }),
  params: z.object({ agencyId: objectIdSchema }),
  query: z.object({}).default({})
});

export const updateExpenseSchema = z.object({
  body: z.object({
    label: z.string().min(2).max(150).optional(),
    category: z.enum(["marketing", "transport", "salary", "office", "legal", "maintenance", "other"]).optional(),
    amount: z.coerce.number().min(0).optional(),
    currency: z.string().min(3).max(5).optional(),
    expenseDate: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
    attachments: z.array(z.string().url()).optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional()
  }),
  params: z.object({ agencyId: objectIdSchema, expenseId: objectIdSchema }),
  query: z.object({}).default({})
});
