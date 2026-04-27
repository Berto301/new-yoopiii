import { StatusCodes } from "http-status-codes";
import {
  disableTwoFactor,
  enableTwoFactor,
  linkSocialProvider,
  loginUser,
  loginWithSocialProvider,
  registerUser,
  unlinkSocialProvider,
  verifyTwoFactor
} from "./auth.service.js";

const buildRequestContext = (req) => ({
  ipAddress: req.ip || req.socket?.remoteAddress || "",
  userAgent: req.headers["user-agent"] || ""
});

export const register = async (req, res) => {
  const result = await registerUser(req.validated.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: result
  });
};

export const login = async (req, res) => {
  const result = await loginUser(req.validated.body, buildRequestContext(req));

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const loginGoogle = async (req, res) => {
  const result = await loginWithSocialProvider({
    provider: "google",
    payload: req.validated.body,
    context: buildRequestContext(req)
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const loginFacebook = async (req, res) => {
  const result = await loginWithSocialProvider({
    provider: "facebook",
    payload: req.validated.body,
    context: buildRequestContext(req)
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const linkProvider = async (req, res) => {
  const result = await linkSocialProvider({
    userId: req.user.id,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const unlinkProvider = async (req, res) => {
  const result = await unlinkSocialProvider({
    userId: req.user.id,
    provider: req.validated.params.provider
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const enableTwoFactorHandler = async (req, res) => {
  const result = await enableTwoFactor({
    userId: req.user.id,
    method: req.validated.body.method
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const verifyTwoFactorHandler = async (req, res) => {
  const result = await verifyTwoFactor({
    userId: req.user?.id || null,
    challengeToken: req.validated.body.challengeToken || "",
    code: req.validated.body.code,
    context: buildRequestContext(req)
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const disableTwoFactorHandler = async (req, res) => {
  const result = await disableTwoFactor({
    userId: req.user.id,
    code: req.validated.body.code || ""
  });

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};
