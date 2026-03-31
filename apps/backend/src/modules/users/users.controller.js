import { StatusCodes } from "http-status-codes";
import { changeMyPassword, getUserProfileById, listUsers, updateMyProfile } from "./users.service.js";

export const getUsers = async (_req, res) => {
  const users = await listUsers();

  res.status(StatusCodes.OK).json({
    success: true,
    data: users
  });
};

export const getMyProfile = async (req, res) => {
  const user = await getUserProfileById(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: user
  });
};

export const patchMyProfile = async (req, res) => {
  const user = await updateMyProfile({ userId: req.user.id, payload: req.validated.body });

  res.status(StatusCodes.OK).json({
    success: true,
    data: user
  });
};

export const changeMyPasswordHandler = async (req, res) => {
  const result = await changeMyPassword({ userId: req.user.id, payload: req.validated.body });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};
