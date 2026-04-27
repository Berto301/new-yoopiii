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
      role: z.enum(["user", "proprietaire", "independent_agent", "agency", "agency_agent"]).default("user")
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

const socialProviderSchema = z.enum(["google", "facebook"]);

export const socialAuthSchema = z.object({
  body: z.object({
    providerId: z.string().trim().min(2).max(255),
    email: z.string().trim().email(),
    firstName: z.string().trim().max(80).optional().default(""),
    lastName: z.string().trim().max(80).optional().default("")
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const linkProviderSchema = z.object({
  body: z.object({
    provider: socialProviderSchema,
    providerId: z.string().trim().min(2).max(255),
    email: z.string().trim().email()
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const unlinkProviderSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    provider: socialProviderSchema
  }),
  query: z.object({}).default({})
});

export const enableTwoFactorSchema = z.object({
  body: z.object({
    method: z.enum(["authenticator", "email"]).default("authenticator")
  }).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const verifyTwoFactorSchema = z.object({
  body: z.object({
    code: z.string().trim().regex(/^\d{6}$/, "OTP code must contain 6 digits"),
    challengeToken: z.string().trim().min(20).optional()
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const disableTwoFactorSchema = z.object({
  body: z.object({
    code: z.string().trim().regex(/^\d{6}$/, "OTP code must contain 6 digits").optional()
  }).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});
