import { StatusCodes } from "http-status-codes";
import { loginUser, registerUser } from "./auth.service.js";

export const register = async (req, res) => {
  const result = await registerUser(req.validated.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: result
  });
};

export const login = async (req, res) => {
  const result = await loginUser(req.validated.body);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};
