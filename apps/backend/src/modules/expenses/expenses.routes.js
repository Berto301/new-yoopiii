import { Router } from "express";
import { authorizeRoles, requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  createExpenseHandler,
  deleteExpenseHandler,
  getExpenseHandler,
  listExpensesHandler,
  updateExpenseHandler
} from "./expenses.controller.js";
import {
  createExpenseSchema,
  expenseIdParamsSchema,
  listExpensesSchema,
  updateExpenseSchema
} from "./expenses.validation.js";

export const expenseRouter = Router();

expenseRouter.use(asyncHandler(requireAuth));
expenseRouter.use(asyncHandler(authorizeRoles("proprietaire")));

expenseRouter.get("/", validate(listExpensesSchema), asyncHandler(listExpensesHandler));
expenseRouter.post("/", validate(createExpenseSchema), asyncHandler(createExpenseHandler));
expenseRouter.get("/:expenseId", validate(expenseIdParamsSchema), asyncHandler(getExpenseHandler));
expenseRouter.put("/:expenseId", validate(updateExpenseSchema), asyncHandler(updateExpenseHandler));
expenseRouter.delete("/:expenseId", validate(expenseIdParamsSchema), asyncHandler(deleteExpenseHandler));
