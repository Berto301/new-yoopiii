import { StatusCodes } from "http-status-codes";
import { listUsers } from "./users.service.js";

export const getUsers = async (_req, res) => {
  const users = await listUsers();

  res.status(StatusCodes.OK).json({
    success: true,
    data: users
  });
};
