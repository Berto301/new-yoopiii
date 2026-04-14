import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
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

const createUser = (overrides = {}) =>
  User.create({
    firstName: overrides.firstName || "Owner",
    lastName: overrides.lastName || "User",
    email: overrides.email || `owner-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: overrides.role || "proprietaire",
    status: "active"
  });

test("owner workspace endpoints return seeded portfolio data for proprietaire users", async () => {
  const owner = await createUser();
  const token = signAccessToken(owner);
  const app = createApp();

  const [dashboardResponse, contractsResponse, rentsResponse, tenantsResponse, propertiesResponse, maintenanceResponse] = await Promise.all([
    request(app).get("/api/v1/owner/dashboard").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/contracts").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/rents").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/tenants").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/properties").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/maintenance").set("Authorization", `Bearer ${token}`)
  ]);

  assert.equal(dashboardResponse.statusCode, 200);
  assert.equal(dashboardResponse.body.data.summary.propertiesCount, 4);
  assert.equal(dashboardResponse.body.data.alerts.length, 3);
  assert.equal(contractsResponse.statusCode, 200);
  assert.equal(contractsResponse.body.data.length, 3);
  assert.equal(rentsResponse.body.data.length, 4);
  assert.equal(tenantsResponse.body.data.length, 3);
  assert.equal(propertiesResponse.body.data.length, 4);
  assert.equal(maintenanceResponse.body.data.length, 3);
});

test("owner workspace endpoints are forbidden for non proprietaire users", async () => {
  const user = await createUser({ role: "user" });
  const token = signAccessToken(user);
  const app = createApp();

  const response = await request(app)
    .get("/api/v1/owner/dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 403);
});
