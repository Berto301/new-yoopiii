import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import request from "supertest";
import { createApp } from "../app.js";
import { Agency } from "../modules/agencies/agency.model.js";
import { AgencyMember } from "../modules/agencies/models/agency-member.model.js";
import { User } from "../modules/users/user.model.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase
} from "./helpers/mongo-test-server.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

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

const generateTotpCode = (secret) => {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
};

before(async () => {
  await connectTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

after(async () => {
  await disconnectTestDatabase();
});

test("agency registration creates agency and links agencyId to user", async () => {
  const app = createApp();

  const response = await request(app).post("/api/v1/auth/register").send({
    firstName: "Aminata",
    lastName: "Kone",
    email: "agency-register@yopii.test",
    phone: "+2250700000000",
    password: "Password123!",
    companyName: "Yopii Prime Agency",
    role: "agency"
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.role, "agency");
  assert.ok(response.body.data.user.agencyId);

  const createdUser = await User.findOne({ email: "agency-register@yopii.test" }).lean();
  const createdAgency = await Agency.findById(response.body.data.user.agencyId).lean();
  const ownerMembership = await AgencyMember.findOne({
    agencyId: response.body.data.user.agencyId,
    userId: createdUser._id,
    role: "owner"
  }).lean();

  assert.ok(createdUser);
  assert.ok(createdAgency);
  assert.equal(String(createdUser.agencyId), String(createdAgency._id));
  assert.equal(createdAgency.name, "Yopii Prime Agency");
  assert.ok(ownerMembership);
});

test("social providers can be linked once and block reuse by another user", async () => {
  const app = createApp();

  const firstResponse = await request(app).post("/api/v1/auth/register").send({
    firstName: "First",
    lastName: "Owner",
    email: "social-first@yopii.test",
    phone: "+2250700000001",
    password: "Password123!",
    role: "user"
  });

  const secondResponse = await request(app).post("/api/v1/auth/register").send({
    firstName: "Second",
    lastName: "Owner",
    email: "social-second@yopii.test",
    phone: "+2250700000002",
    password: "Password123!",
    role: "user"
  });

  const linkResponse = await request(app)
    .post("/api/v1/auth/link-provider")
    .set("Authorization", `Bearer ${firstResponse.body.data.accessToken}`)
    .send({
      provider: "google",
      providerId: "google-unique-001",
      email: "first-google@yopii.test"
    });

  assert.equal(linkResponse.statusCode, 200);
  assert.equal(linkResponse.body.data.user.socialProviders.length, 1);

  const reuseResponse = await request(app)
    .post("/api/v1/auth/link-provider")
    .set("Authorization", `Bearer ${secondResponse.body.data.accessToken}`)
    .send({
      provider: "google",
      providerId: "google-unique-001",
      email: "second-google@yopii.test"
    });

  assert.equal(reuseResponse.statusCode, 409);
  assert.equal(reuseResponse.body.type, "auth.already_used");
});

test("authenticator 2FA can be enabled and is required on login", async () => {
  const app = createApp();

  const registerResponse = await request(app).post("/api/v1/auth/register").send({
    firstName: "Two",
    lastName: "Factor",
    email: "two-factor@yopii.test",
    phone: "+2250700000003",
    password: "Password123!",
    role: "user"
  });

  const accessToken = registerResponse.body.data.accessToken;

  const enableResponse = await request(app)
    .post("/api/v1/auth/2fa/enable")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method: "authenticator" });

  assert.equal(enableResponse.statusCode, 200);
  assert.ok(enableResponse.body.data.secret);
  assert.ok(enableResponse.body.data.qrCodeUrl.includes("create-qr-code"));

  const setupCode = generateTotpCode(enableResponse.body.data.secret);
  const verifySetupResponse = await request(app)
    .post("/api/v1/auth/2fa/verify")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ code: setupCode });

  assert.equal(verifySetupResponse.statusCode, 200);
  assert.equal(verifySetupResponse.body.data.twoFactor.isEnabled, true);

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email: "two-factor@yopii.test",
    password: "Password123!"
  });

  assert.equal(loginResponse.statusCode, 200);
  assert.equal(loginResponse.body.data.requires2FA, true);
  assert.ok(loginResponse.body.data.twoFactorToken);

  const challengeCode = generateTotpCode(enableResponse.body.data.secret);
  const verifyLoginResponse = await request(app)
    .post("/api/v1/auth/2fa/verify")
    .send({
      challengeToken: loginResponse.body.data.twoFactorToken,
      code: challengeCode
    });

  assert.equal(verifyLoginResponse.statusCode, 200);
  assert.ok(verifyLoginResponse.body.data.accessToken);
  assert.equal(verifyLoginResponse.body.data.user.twoFactor.isEnabled, true);
});
