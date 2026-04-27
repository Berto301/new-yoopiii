import { Router } from "express";
import { asyncHandler } from "../../core/utils/async-handler.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { optionalAuth, requireAuth } from "../../core/middleware/auth.middleware.js";
import {
  disableTwoFactorHandler,
  enableTwoFactorHandler,
  linkProvider,
  login,
  loginFacebook,
  loginGoogle,
  register,
  unlinkProvider,
  verifyTwoFactorHandler
} from "./auth.controller.js";
import {
  disableTwoFactorSchema,
  enableTwoFactorSchema,
  linkProviderSchema,
  loginSchema,
  registerSchema,
  socialAuthSchema,
  unlinkProviderSchema,
  verifyTwoFactorSchema
} from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), asyncHandler(register));
authRouter.post("/login", validate(loginSchema), asyncHandler(login));
authRouter.post("/google", validate(socialAuthSchema), asyncHandler(loginGoogle));
authRouter.post("/facebook", validate(socialAuthSchema), asyncHandler(loginFacebook));
authRouter.post("/link-provider", asyncHandler(requireAuth), validate(linkProviderSchema), asyncHandler(linkProvider));
authRouter.delete("/link-provider/:provider", asyncHandler(requireAuth), validate(unlinkProviderSchema), asyncHandler(unlinkProvider));
authRouter.post("/2fa/enable", asyncHandler(requireAuth), validate(enableTwoFactorSchema), asyncHandler(enableTwoFactorHandler));
authRouter.post("/2fa/verify", asyncHandler(optionalAuth), validate(verifyTwoFactorSchema), asyncHandler(verifyTwoFactorHandler));
authRouter.post("/2fa/disable", asyncHandler(requireAuth), validate(disableTwoFactorSchema), asyncHandler(disableTwoFactorHandler));
