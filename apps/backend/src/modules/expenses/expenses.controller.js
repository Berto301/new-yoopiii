import { StatusCodes } from "http-status-codes";
import {
  createOwnerExpense,
  deleteOwnerExpense,
  getOwnerExpenseById,
  listOwnerExpenses,
  updateOwnerExpense
} from "./expenses.service.js";

export const listExpensesHandler = async (req, res) => {
  const data = await listOwnerExpenses({
    ownerId: req.user.id,
    filters: req.validated.query
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data
  });
};

export const getExpenseHandler = async (req, res) => {
  const data = await getOwnerExpenseById({
    ownerId: req.user.id,
    expenseId: req.validated.params.expenseId
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data
  });
};

export const createExpenseHandler = async (req, res) => {
  const data = await createOwnerExpense({
    ownerId: req.user.id,
    actorUserId: req.user.id,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    data
  });
};

export const updateExpenseHandler = async (req, res) => {
  const data = await updateOwnerExpense({
    ownerId: req.user.id,
    actorUserId: req.user.id,
    expenseId: req.validated.params.expenseId,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data
  });
};

export const deleteExpenseHandler = async (req, res) => {
  const data = await deleteOwnerExpense({
    ownerId: req.user.id,
    expenseId: req.validated.params.expenseId
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data
  });
};
