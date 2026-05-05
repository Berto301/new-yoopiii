import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  changeMyPasswordHandler,
  getDiscoverableAgents,
  getAgentScoreHandler,
  getMyAgentReviewHandler,
  getTopAgentsHandler,
  getMyProfile,
  getUserById,
  patchMyPreferences,
  getUsers,
  postAgentReviewHandler,
  postAgentsScoreRecalculationHandler,
  postAgentScoreRecalculationHandler,
  patchMyProfile,
  uploadMyAvatarHandler
} from "./users.controller.js";
import { uploadProfileAvatar } from "./users.upload.js";
import { agentIdParamsSchema, agentReviewSchema, agentScoreCollectionSchema, changePasswordSchema, discoverAgentsSchema, topAgentsSchema, updateMyPreferencesSchema, updateMyProfileSchema, userIdParamsSchema } from "./users.validation.js";

export const userRouter = Router();

userRouter.get("/", asyncHandler(getUsers));
userRouter.use(asyncHandler(requireAuth));
userRouter.get("/agents/top", validate(topAgentsSchema), asyncHandler(getTopAgentsHandler));
userRouter.post("/agents/recalculate-scores", validate(agentScoreCollectionSchema), asyncHandler(postAgentsScoreRecalculationHandler));
userRouter.get("/agents/discovery", validate(discoverAgentsSchema), asyncHandler(getDiscoverableAgents));
userRouter.get("/agents/:agentId/score", validate(agentIdParamsSchema), asyncHandler(getAgentScoreHandler));
userRouter.post("/agents/:agentId/recalculate-score", validate(agentIdParamsSchema), asyncHandler(postAgentScoreRecalculationHandler));
userRouter.get("/agents/:agentId/ratings/me", validate(agentIdParamsSchema), asyncHandler(getMyAgentReviewHandler));
userRouter.post("/agents/:agentId/ratings", validate(agentReviewSchema), asyncHandler(postAgentReviewHandler));
userRouter.get("/me", asyncHandler(getMyProfile));
userRouter.post("/me/avatar", uploadProfileAvatar, asyncHandler(uploadMyAvatarHandler));
userRouter.patch("/me/profile", validate(updateMyProfileSchema), asyncHandler(patchMyProfile));
userRouter.patch("/me/preferences", validate(updateMyPreferencesSchema), asyncHandler(patchMyPreferences));
userRouter.patch("/me/password", validate(changePasswordSchema), asyncHandler(changeMyPasswordHandler));
userRouter.get("/:userId", validate(userIdParamsSchema), asyncHandler(getUserById));

