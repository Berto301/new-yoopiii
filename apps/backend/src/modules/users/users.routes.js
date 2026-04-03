import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  changeMyPasswordHandler,
  getDiscoverableAgents,
  getMyProfile,
  getUsers,
  patchMyProfile,
  uploadMyAvatarHandler
} from "./users.controller.js";
import { uploadProfileAvatar } from "./users.upload.js";
import { changePasswordSchema, discoverAgentsSchema, updateMyProfileSchema } from "./users.validation.js";

export const userRouter = Router();

userRouter.get("/", asyncHandler(getUsers));
userRouter.use(asyncHandler(requireAuth));
userRouter.get("/agents/discovery", validate(discoverAgentsSchema), asyncHandler(getDiscoverableAgents));
userRouter.get("/me", asyncHandler(getMyProfile));
userRouter.post("/me/avatar", uploadProfileAvatar, asyncHandler(uploadMyAvatarHandler));
userRouter.patch("/me/profile", validate(updateMyProfileSchema), asyncHandler(patchMyProfile));
userRouter.patch("/me/password", validate(changePasswordSchema), asyncHandler(changeMyPasswordHandler));
