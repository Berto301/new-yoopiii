import { StatusCodes } from "http-status-codes";
import { listDiscoverableAgents } from "./agent-directory.service.js";
import { changeMyPassword, getUserProfileById, listUsers, updateMyPreferences, updateMyProfile, uploadMyProfileAvatar } from "./users.service.js";

export const getUsers = async (_req, res) => {
  const users = await listUsers();

  res.status(StatusCodes.OK).json({
    success: true,
    data: users
  });
};

export const getDiscoverableAgents = async (req, res) => {
  const data = await listDiscoverableAgents({ filters: req.validated.query });

  res.status(StatusCodes.OK).json({
    success: true,
    data
  });
};

export const getMyProfile = async (req, res) => {
  const user = await getUserProfileById(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: user
  });
};

export const getUserById = async (req, res) => {
  const user = await getUserProfileById(req.validated.params.userId);

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

export const patchMyPreferences = async (req, res) => {
  const user = await updateMyPreferences({ userId: req.user.id, payload: req.validated.body });

  res.status(StatusCodes.OK).json({
    success: true,
    data: user
  });
};

export const uploadMyAvatarHandler = async (req, res) => {
  const user = await uploadMyProfileAvatar({ userId: req.user.id, file: req.file });

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
