import { z } from "zod";
import { OWNER_EXPENSE_CATEGORIES } from "./expense.model.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const expenseTypeSchema = z.enum(["actif", "passif", "asset", "liability"]);
const expenseCategorySchema = z.enum(OWNER_EXPENSE_CATEGORIES);

const optionalObjectIdSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined || value === "all") {
    return undefined;
  }

  return value;
}, objectIdSchema.optional());

const optionalTypeSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined || value === "all") {
    return undefined;
  }

  return value;
}, expenseTypeSchema.optional());

const optionalCategorySchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined || value === "all") {
    return undefined;
  }

  return value;
}, expenseCategorySchema.optional());

const optionalNumberSchema = ({ min, max } = {}) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined || value === "all") {
      return undefined;
    }

    return value;
  }, z.coerce.number().int().min(min).max(max).optional());

const expenseBodySchema = z.object({
  propertyId: optionalObjectIdSchema,
  propertyLabel: z.string().trim().max(255).default(""),
  label: z.string().trim().min(2).max(255),
  description: z.string().trim().max(5000).default(""),
  category: expenseCategorySchema,
  type: expenseTypeSchema.optional(),
  amount: z.coerce.number().min(0),
  currency: z.string().trim().min(2).max(8).default("MGA"),
  expenseDate: z.coerce.date(),
  budgetAmount: z.coerce.number().min(0).default(0)
});

export const listExpensesSchema = z.object({
  params: z.object({}).optional().default({}),
  body: z.object({}).optional().default({}),
  query: z.object({
    year: optionalNumberSchema({ min: 1970, max: 2200 }),
    month: optionalNumberSchema({ min: 1, max: 12 }),
    propertyId: optionalObjectIdSchema,
    type: optionalTypeSchema,
    category: optionalCategorySchema
  }).optional().default({})
});

export const expenseIdParamsSchema = z.object({
  params: z.object({
    expenseId: objectIdSchema
  }),
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({})
});

export const createExpenseSchema = z.object({
  params: z.object({}).optional().default({}),
  body: expenseBodySchema,
  query: z.object({}).optional().default({})
});

export const updateExpenseSchema = z.object({
  params: z.object({
    expenseId: objectIdSchema
  }),
  body: expenseBodySchema,
  query: z.object({}).optional().default({})
});
