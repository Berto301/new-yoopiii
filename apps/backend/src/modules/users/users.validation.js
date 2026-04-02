import { z } from "zod";

const phoneSchema = z.string().max(40).optional().or(z.literal(""));
const numberFromQuery = (fieldName) =>
  z.coerce.number({
    invalid_type_error: `${fieldName} must be a number`
  });
const emptyStringToUndefined = (schema) => z.preprocess((value) => (value === "" ? undefined : value), schema);

export const updateMyProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    email: z.string().email(),
    phone: phoneSchema,
    avatar: z.string().url().optional().nullable()
  }),
  params: z.object({}).default({}),
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
    role: z.enum(["all", "manager", "supervisor", "agent", "assistant", "viewer", "independent_agent"]).default("all"),
    page: numberFromQuery("page").min(1).default(1),
    limit: numberFromQuery("limit").min(1).max(100).default(20)
  })
});
