import { z } from "zod";

export const registerSchema = z.object({
  body: z
    .object({
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(8),
      companyName: z.string().min(2).optional(),
      role: z.enum(["user", "independent_agent", "agency", "agency_agent"]).default("user")
    })
    .superRefine((value, ctx) => {
      if (value.role === "agency" && !value.companyName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "companyName is required for agency registration"
        });
      }
    }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});
