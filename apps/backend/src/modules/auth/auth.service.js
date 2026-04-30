import crypto from "crypto";
import { signAccessToken } from "../../core/utils/jwt.js";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/app-error.js";
import { env } from "../../config/env.js";
import { Agency } from "../agencies/agency.model.js";
import { AGENCY_ROLE_PERMISSIONS } from "../agencies/constants/agency-permissions.js";
import { AgencyMember } from "../agencies/models/agency-member.model.js";
import { RoleTemplate } from "../agencies/models/role-template.model.js";
import { User } from "../users/user.model.js";
import { AuthLoginLog } from "./auth-login-log.model.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TWO_FACTOR_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const TWO_FACTOR_PENDING_TTL_MS = 10 * 60 * 1000;
const TWO_FACTOR_MAX_ATTEMPTS = 5;
const TWO_FACTOR_LOCK_MS = 10 * 60 * 1000;

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const getEncryptionKey = () => crypto.createHash("sha256").update(env.jwtAccessSecret).digest();

const hashToken = (value) =>
  crypto.createHmac("sha256", env.jwtAccessSecret).update(String(value)).digest("hex");

const hashSecret = (value) =>
  crypto.createHmac("sha256", env.jwtAccessSecret).update(String(value)).digest("hex");

const encryptSecret = (secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);

  return {
    iv: iv.toString("base64"),
    value: encrypted.toString("base64"),
    tag: cipher.getAuthTag().toString("base64")
  };
};

const decryptSecret = (encryptedSecret = {}) => {
  if (!encryptedSecret.iv || !encryptedSecret.value || !encryptedSecret.tag) {
    return "";
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(encryptedSecret.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encryptedSecret.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedSecret.value, "base64")),
    decipher.final()
  ]).toString("utf8");
};

const base32Encode = (buffer) => {
  let bits = "";
  let output = "";

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }

  return output;
};

const base32Decode = (value) => {
  const cleanValue = String(value || "").replace(/=+$/g, "").toUpperCase();
  let bits = "";

  for (const character of cleanValue) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index >= 0) {
      bits += index.toString(2).padStart(5, "0");
    }
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
};

const generateTwoFactorSecret = () => base32Encode(crypto.randomBytes(20));

const generateOtpCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const generateTotpCode = ({ secret, counter }) => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = crypto
    .createHmac("sha1", base32Decode(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
};

const verifyTotpCode = ({ secret, code, now = Date.now(), window = 1 }) => {
  const currentCounter = Math.floor(now / 1000 / 30);

  for (let offset = -window; offset <= window; offset += 1) {
    if (generateTotpCode({ secret, counter: currentCounter + offset }) === code) {
      return true;
    }
  }

  return false;
};

const buildOtpAuthUri = ({ user, secret }) => {
  const label = encodeURIComponent(`Yopii:${user.email}`);
  const issuer = encodeURIComponent("Yopii");
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
};

const buildQrCodeUrl = (otpauthUri) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUri)}`;

const buildPublicSocialProviders = (providers = []) =>
  providers.map((provider) => ({
    provider: provider.provider,
    providerId: provider.providerId,
    email: provider.email,
    linkedAt: provider.linkedAt
  }));

const buildPublicTwoFactor = (twoFactor = {}) => ({
  isEnabled: Boolean(twoFactor.isEnabled),
  method: twoFactor.method || "authenticator"
});

const createLoginLog = async ({ user = null, email = "", provider = "password", status, reason = "", context = {} }) => {
  await AuthLoginLog.create({
    userId: user?._id || user?.id || null,
    email: normalizeEmail(email || user?.email || ""),
    provider,
    status,
    reason,
    ipAddress: context.ipAddress || "",
    userAgent: context.userAgent || ""
  });
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

const buildUniqueAgencySlug = async (companyName) => {
  const baseSlug = slugify(companyName) || `agency-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;

  while (await Agency.findOne({ slug }).lean()) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

const resolveRoleTemplatePermissions = async (roleTemplateId) => {
  if (!roleTemplateId) {
    return [];
  }

  const roleTemplate = await RoleTemplate.findById(roleTemplateId).lean();
  return roleTemplate?.permissions || [];
};

const resolveUserPermissionState = async (user) => {
  if (user.role === "agency") {
    return {
      permissionId: user.permissionId ? String(user.permissionId) : null,
      permissions: await resolveRoleTemplatePermissions(user.permissionId)
    };
  }

  if (user.role === "agency_agent" && user.agencyId) {
    const member = await AgencyMember.findOne({
      agencyId: user.agencyId,
      userId: user._id,
      status: "active"
    }).lean();

    return {
      permissionId: member?.permissionId ? String(member.permissionId) : null,
      permissions: member?.permissionId
        ? await resolveRoleTemplatePermissions(member.permissionId)
        : member?.permissions || []
    };
  }

  return {
    permissionId: user.permissionId ? String(user.permissionId) : null,
    permissions: []
  };
};

const formatAuthUser = async (user) => {
  const permissionState = await resolveUserPermissionState(user);

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatar: user.avatar || null,
    role: user.role,
    agencyId: user.agencyId || null,
    permissionId: permissionState.permissionId,
    permissions: permissionState.permissions,
    score: user.score || 0,
    scoreDetails: user.scoreDetails || null,
    preferences: user.preferences || {},
    socialProviders: buildPublicSocialProviders(user.socialProviders || []),
    twoFactor: buildPublicTwoFactor(user.twoFactor || {})
  };
};

export const registerUser = async (payload) => {
  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new AppError("Email already in use", StatusCodes.CONFLICT);
  }

  const passwordHash = await User.hashPassword(payload.password);

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    permissionId: null,
    passwordHash
  });

  if (payload.role === "agency") {
    const slug = await buildUniqueAgencySlug(payload.companyName);

    const agency = await Agency.create({
      name: payload.companyName,
      slug,
      contactEmail: payload.email,
      contactPhone: payload.phone || "",
      ownerUserId: user._id,
      status: "active"
    });

    const ownerRoleTemplate = await RoleTemplate.create({
      agencyId: agency._id,
      name: "owner",
      key: "owner",
      permissions: AGENCY_ROLE_PERMISSIONS.owner,
      isSystem: true,
      createdBy: user._id
    });

    user.agencyId = agency._id;
    user.permissionId = ownerRoleTemplate._id;
    await user.save();

    await AgencyMember.create({
      agencyId: agency._id,
      userId: user._id,
      role: "owner",
      permissionId: ownerRoleTemplate._id,
      permissions: ownerRoleTemplate.permissions,
      status: "active",
      invitedBy: user._id,
      jobTitle: "Owner"
    });
  }

  return {
    user: await formatAuthUser(user),
    accessToken: signAccessToken(user)
  };
};

const buildAuthenticatedResult = async (user, context = {}) => {
  user.lastLoginAt = new Date();
  user.twoFactor.challenge = {
    tokenHash: "",
    otpHash: "",
    expiresAt: null,
    failedAttempts: 0,
    lockedUntil: null
  };
  await user.save();

  await createLoginLog({
    user,
    provider: context.provider || "password",
    status: "success",
    context
  });

  return {
    user: await formatAuthUser(user),
    accessToken: signAccessToken(user)
  };
};

const createTwoFactorChallenge = async ({ user, provider = "password", context = {} }) => {
  const challengeToken = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  let developmentOtp = null;

  user.twoFactor.challenge.tokenHash = hashToken(challengeToken);
  user.twoFactor.challenge.expiresAt = new Date(now.getTime() + TWO_FACTOR_CHALLENGE_TTL_MS);
  user.twoFactor.challenge.failedAttempts = 0;
  user.twoFactor.challenge.lockedUntil = null;

  if (user.twoFactor.method === "email") {
    const otp = generateOtpCode();
    user.twoFactor.challenge.otpHash = await User.hashPassword(otp);
    developmentOtp = env.nodeEnv === "production" ? null : otp;
  } else {
    user.twoFactor.challenge.otpHash = "";
  }

  await user.save();
  await createLoginLog({
    user,
    provider,
    status: "2fa_required",
    context
  });

  return {
    requires2FA: true,
    twoFactorToken: challengeToken,
    method: user.twoFactor.method || "authenticator",
    expiresAt: user.twoFactor.challenge.expiresAt,
    ...(developmentOtp ? { developmentOtp } : {})
  };
};

const finishLoginOrChallenge = async ({ user, provider = "password", context = {} }) => {
  if (user.twoFactor?.isEnabled) {
    return createTwoFactorChallenge({ user, provider, context });
  }

  return buildAuthenticatedResult(user, { ...context, provider });
};

export const loginUser = async ({ email, password }, context = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    await createLoginLog({ email: normalizedEmail, provider: "password", status: "failed", reason: "invalid_credentials", context });
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    await createLoginLog({ user, provider: "password", status: "failed", reason: "invalid_credentials", context });
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  return finishLoginOrChallenge({ user, provider: "password", context });
};

const findSocialProviderOwner = ({ provider, providerId }) =>
  User.findOne({
    socialProviders: {
      $elemMatch: {
        provider,
        providerId
      }
    }
  });

const findUserBySocialEmail = ({ email }) => User.findOne({ email: normalizeEmail(email) });

export const loginWithSocialProvider = async ({ provider, payload, context = {} }) => {
  const normalizedEmail = normalizeEmail(payload.email);
  const providerOwner = await findSocialProviderOwner({ provider, providerId: payload.providerId });

  if (providerOwner) {
    if (providerOwner.status !== "active") {
      await createLoginLog({ user: providerOwner, provider, status: "blocked", reason: "inactive_user", context });
      throw new AppError("Account is disabled", StatusCodes.FORBIDDEN);
    }

    return finishLoginOrChallenge({ user: providerOwner, provider, context });
  }

  const existingUser = await findUserBySocialEmail({ email: normalizedEmail });

  if (existingUser) {
    await createLoginLog({ user: existingUser, provider, status: "blocked", reason: "provider_not_linked", context });
    throw new AppError("This account is already in use", StatusCodes.CONFLICT, null, {
      type: "auth.already_used"
    });
  }

  const generatedPasswordHash = await User.hashPassword(crypto.randomUUID());
  const user = await User.create({
    firstName: payload.firstName || "Social",
    lastName: payload.lastName || "User",
    email: normalizedEmail,
    phone: "",
    role: "user",
    passwordHash: generatedPasswordHash,
    socialProviders: [{
      provider,
      providerId: payload.providerId,
      email: normalizedEmail,
      linkedAt: new Date()
    }],
    isVerified: true
  });

  return buildAuthenticatedResult(user, { ...context, provider });
};

export const linkSocialProvider = async ({ userId, payload }) => {
  const providerOwner = await findSocialProviderOwner({
    provider: payload.provider,
    providerId: payload.providerId
  });

  if (providerOwner && String(providerOwner._id) !== String(userId)) {
    throw new AppError("This account is already in use", StatusCodes.CONFLICT, null, {
      type: "auth.already_used"
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  const normalizedEmail = normalizeEmail(payload.email);
  const existingProviderIndex = (user.socialProviders || []).findIndex((item) => item.provider === payload.provider);
  const nextProvider = {
    provider: payload.provider,
    providerId: payload.providerId,
    email: normalizedEmail,
    linkedAt: new Date()
  };

  if (existingProviderIndex >= 0) {
    user.socialProviders[existingProviderIndex] = nextProvider;
  } else {
    user.socialProviders.push(nextProvider);
  }

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("This account is already in use", StatusCodes.CONFLICT, null, {
        type: "auth.already_used"
      });
    }

    throw error;
  }

  return {
    user: await formatAuthUser(user)
  };
};

export const unlinkSocialProvider = async ({ userId, provider }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  user.socialProviders = (user.socialProviders || []).filter((item) => item.provider !== provider);
  await user.save();

  return {
    user: await formatAuthUser(user)
  };
};

export const enableTwoFactor = async ({ userId, method = "authenticator" }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  const now = new Date();
  const secret = generateTwoFactorSecret();
  const encryptedSecret = encryptSecret(secret);
  const otpauthUri = buildOtpAuthUri({ user, secret });
  let developmentOtp = null;
  let otpHash = "";

  if (method === "email") {
    const otp = generateOtpCode();
    otpHash = await User.hashPassword(otp);
    developmentOtp = env.nodeEnv === "production" ? null : otp;
  }

  user.twoFactor.pending = {
    method,
    secretHash: hashSecret(secret),
    secretEncrypted: encryptedSecret,
    otpHash,
    expiresAt: new Date(now.getTime() + TWO_FACTOR_PENDING_TTL_MS)
  };

  await user.save();

  return {
    method,
    secret,
    otpauthUri,
    qrCodeUrl: buildQrCodeUrl(otpauthUri),
    expiresAt: user.twoFactor.pending.expiresAt,
    ...(developmentOtp ? { developmentOtp } : {})
  };
};

const assertTwoFactorNotLocked = (twoFactor) => {
  const lockedUntil = twoFactor?.challenge?.lockedUntil;

  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    throw new AppError("Too many OTP attempts. Please try again later.", StatusCodes.TOO_MANY_REQUESTS);
  }
};

const registerTwoFactorFailure = async (user) => {
  const failedAttempts = Number(user.twoFactor.challenge.failedAttempts || 0) + 1;
  user.twoFactor.challenge.failedAttempts = failedAttempts;

  if (failedAttempts >= TWO_FACTOR_MAX_ATTEMPTS) {
    user.twoFactor.challenge.lockedUntil = new Date(Date.now() + TWO_FACTOR_LOCK_MS);
  }

  await user.save();
};

const verifyTwoFactorSecretCode = ({ encryptedSecret, code }) =>
  verifyTotpCode({
    secret: decryptSecret(encryptedSecret),
    code
  });

const verifyPendingTwoFactor = async ({ user, code }) => {
  const pending = user.twoFactor.pending || {};

  if (!pending.method || !pending.expiresAt || new Date(pending.expiresAt).getTime() < Date.now()) {
    throw new AppError("Two-factor setup expired", StatusCodes.BAD_REQUEST);
  }

  const isValid = pending.method === "email"
    ? Boolean(pending.otpHash) && await bcryptCompareOtp(code, pending.otpHash)
    : verifyTwoFactorSecretCode({ encryptedSecret: pending.secretEncrypted, code });

  if (!isValid) {
    throw new AppError("Invalid OTP code", StatusCodes.UNAUTHORIZED);
  }

  user.twoFactor.isEnabled = true;
  user.twoFactor.method = pending.method;
  user.twoFactor.secretHash = pending.secretHash;
  user.twoFactor.secretEncrypted = pending.secretEncrypted;
  user.twoFactor.pending = {
    method: "",
    secretHash: "",
    secretEncrypted: { iv: "", value: "", tag: "" },
    otpHash: "",
    expiresAt: null
  };
  await user.save();

  return {
    user: await formatAuthUser(user),
    twoFactor: buildPublicTwoFactor(user.twoFactor)
  };
};

const bcryptCompareOtp = (code, hash) => User.prototype.comparePassword.call({ passwordHash: hash }, code);

const verifyChallengeTwoFactor = async ({ challengeToken, code, context = {} }) => {
  const user = await User.findOne({ "twoFactor.challenge.tokenHash": hashToken(challengeToken) });

  if (!user) {
    await createLoginLog({ provider: "2fa", status: "failed", reason: "challenge_not_found", context });
    throw new AppError("Invalid OTP challenge", StatusCodes.UNAUTHORIZED);
  }

  assertTwoFactorNotLocked(user.twoFactor);

  const challenge = user.twoFactor.challenge || {};
  if (!challenge.expiresAt || new Date(challenge.expiresAt).getTime() < Date.now()) {
    await createLoginLog({ user, provider: "2fa", status: "failed", reason: "challenge_expired", context });
    throw new AppError("OTP challenge expired", StatusCodes.UNAUTHORIZED);
  }

  const isValid = user.twoFactor.method === "email"
    ? Boolean(challenge.otpHash) && await bcryptCompareOtp(code, challenge.otpHash)
    : verifyTwoFactorSecretCode({ encryptedSecret: user.twoFactor.secretEncrypted, code });

  if (!isValid) {
    await registerTwoFactorFailure(user);
    await createLoginLog({ user, provider: "2fa", status: "failed", reason: "invalid_otp", context });
    throw new AppError("Invalid OTP code", StatusCodes.UNAUTHORIZED);
  }

  return buildAuthenticatedResult(user, { ...context, provider: "2fa" });
};

export const verifyTwoFactor = async ({ userId = null, challengeToken = "", code, context = {} }) => {
  if (challengeToken) {
    return verifyChallengeTwoFactor({ challengeToken, code, context });
  }

  if (!userId) {
    throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED);
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  return verifyPendingTwoFactor({ user, code });
};

export const disableTwoFactor = async ({ userId, code }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  if (user.twoFactor?.isEnabled && user.twoFactor.method === "authenticator") {
    if (!code) {
      throw new AppError("OTP code is required", StatusCodes.BAD_REQUEST);
    }

    const isValid = verifyTwoFactorSecretCode({ encryptedSecret: user.twoFactor.secretEncrypted, code });

    if (!isValid) {
      throw new AppError("Invalid OTP code", StatusCodes.UNAUTHORIZED);
    }
  }

  user.twoFactor = {
    isEnabled: false,
    method: "authenticator",
    secretHash: "",
    secretEncrypted: { iv: "", value: "", tag: "" },
    pending: {
      method: "",
      secretHash: "",
      secretEncrypted: { iv: "", value: "", tag: "" },
      otpHash: "",
      expiresAt: null
    },
    challenge: {
      tokenHash: "",
      otpHash: "",
      expiresAt: null,
      failedAttempts: 0,
      lockedUntil: null
    }
  };

  await user.save();

  return {
    user: await formatAuthUser(user),
    twoFactor: buildPublicTwoFactor(user.twoFactor)
  };
};
