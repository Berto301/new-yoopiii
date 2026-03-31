import { z } from "zod";

const phoneSchema = z.string().max(40).optional().or(z.literal(""));

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
