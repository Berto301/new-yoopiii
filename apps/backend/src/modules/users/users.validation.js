import { z } from "zod";

const phoneSchema = z.string().max(40).optional().or(z.literal(""));
const cinSchema = z.string().trim().max(120).optional().or(z.literal(""));
const addressSchema = z.string().trim().max(255).optional().or(z.literal(""));
const genderSchema = z.enum(["homme", "femme", "autre"]).optional().or(z.literal(""));
const numberFromQuery = (fieldName) =>
  z.coerce.number({
    invalid_type_error: `${fieldName} must be a number`
  });
const emptyStringToUndefined = (schema) => z.preprocess((value) => (value === "" ? undefined : value), schema);
const emptyStringToNull = (schema) => z.preprocess((value) => (value === "" ? null : value), schema);
const avatarSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    return value;
  },
  z
    .string()
    .trim()
    .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
      message: "Avatar must be a public URL or an uploaded file path"
    })
    .nullable()
);

const smartMatchingSchema = z.object({
  enabled: z.boolean().default(false),
  budgetReal: emptyStringToNull(z.coerce.number().min(0).nullable()).optional().default(null),
  purpose: z.enum(["sale", "rent"]).optional().or(z.literal("")).default(""),
  propertyTypes: z.array(z.enum(["house", "land", "apartment", "commercial", "office", "warehouse"])).default([]),
  location: z.object({
    enabled: z.boolean().default(false),
    lat: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().nullable()).default(null),
    lng: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().nullable()).default(null),
    label: z.string().trim().max(255).default("")
  }).default({
    enabled: false,
    lat: null,
    lng: null,
    label: ""
  }),
  searchRadiusKm: z.union([z.literal(1), z.literal(5), z.literal(100)]).default(5),
  criteria: z.object({
    version: z.coerce.number().int().min(1).default(1),
    custom: z.record(z.string(), z.any()).default({})
  }).default({
    version: 1,
    custom: {}
  })
});

export const updateMyProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    email: z.string().email(),
    phone: phoneSchema,
    cin: cinSchema,
    adresse: addressSchema,
    sexe: genderSchema,
    avatar: avatarSchema.optional()
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const updateMyPreferencesSchema = z.object({
  body: z.object({
    language: z.enum(["en", "fr"]),
    theme: z.enum(["light", "dark"]),
    currency: z.string().trim().min(3).max(8).transform((value) => value.toUpperCase()),
    notificationsEnabled: z.boolean().optional().default(true),
    pushNotificationsEnabled: z.boolean().optional().default(false),
    contractDefaultCommission: z.coerce.number().min(0).max(100),
    smartMatching: smartMatchingSchema.optional()
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const userIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id")
  }),
  query: z.object({}).default({})
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6)
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
}).refine((value) => value.body.currentPassword !== value.body.newPassword, {
  message: "New password must be different from current password",
  path: ["body", "newPassword"]
});

export const discoverAgentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: emptyStringToUndefined(z.string().trim().max(120).optional()),
    agencyType: z.enum(["all", "agency", "independent"]).default("all"),
    role: z.enum(["all", "agency", "manager", "supervisor", "agent", "assistant", "viewer", "independent_agent"]).default("all"),
    page: numberFromQuery("page").min(1).default(1),
    limit: numberFromQuery("limit").min(1).max(100).default(20)
  })
});

export const agentIdParamsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    agentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid agent id")
  }),
  query: z.object({}).default({})
});

export const agentScoreCollectionSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const topAgentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    limit: numberFromQuery("limit").min(1).max(50).default(10)
  })
});

export const agentReviewSchema = z.object({
  body: z.object({
    score: z.coerce.number().min(0).max(100),
    description: z.string().trim().max(1000).optional().or(z.literal(""))
  }),
  params: z.object({
    agentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid agent id")
  }),
  query: z.object({}).default({})
});
