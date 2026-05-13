import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const assetTypeSchema = z.enum(["rented", "purchased"]);
const paymentMethodSchema = z.enum(["cash", "bank_transfer", "mobile_money", "card", "check", "other", ""]);

export const userAssetParamsSchema = z.object({
  params: z.object({
    assetType: assetTypeSchema,
    assetId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const userAssetIssueSchema = z.object({
  params: z.object({
    assetType: assetTypeSchema,
    assetId: objectIdSchema
  }),
  body: z.object({
    title: z.string().trim().min(3).max(255),
    description: z.string().trim().min(10).max(5000),
    priority: z.enum(["low", "medium", "high"]).default("medium")
  }),
  query: z.object({}).optional().default({})
});

export const userAssetFeedbackSchema = z.object({
  params: z.object({
    assetType: assetTypeSchema,
    assetId: objectIdSchema
  }),
  body: z.object({
    subject: z.string().trim().max(160).default(""),
    message: z.string().trim().min(10).max(4000),
    rating: z.coerce.number().min(0).max(5).default(0)
  }),
  query: z.object({}).optional().default({})
});

export const userAssetPaymentParamsSchema = z.object({
  params: z.object({
    assetType: assetTypeSchema,
    assetId: objectIdSchema,
    paymentId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

const userRentPaymentBodySchema = z.object({
  dueDate: z.coerce.date(),
  paymentDate: z.coerce.date(),
  paymentMethod: paymentMethodSchema.default(""),
  paymentReference: z.string().trim().max(160).default(""),
  paidAmount: z.coerce.number().min(0),
  proofUrl: z.string().trim().max(1000).default(""),
  proofName: z.string().trim().max(255).default(""),
  note: z.string().trim().max(2000).default("")
});

export const createUserAssetPaymentSchema = z.object({
  params: z.object({
    assetType: assetTypeSchema,
    assetId: objectIdSchema
  }),
  body: userRentPaymentBodySchema,
  query: z.object({}).optional().default({})
});

export const updateUserAssetPaymentSchema = z.object({
  params: z.object({
    assetType: assetTypeSchema,
    assetId: objectIdSchema,
    paymentId: objectIdSchema
  }),
  body: userRentPaymentBodySchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  query: z.object({}).optional().default({})
});
