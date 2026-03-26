import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
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
