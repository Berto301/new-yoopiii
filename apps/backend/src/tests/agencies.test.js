import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { AGENCY_PERMISSIONS, AGENCY_ROLE_PERMISSIONS } from "../modules/agencies/constants/agency-permissions.js";

test("agency permission matrix exposes owner access", () => {
  assert.equal(AGENCY_ROLE_PERMISSIONS.owner.includes(AGENCY_PERMISSIONS.EXPENSES_APPROVE), true);
  assert.equal(AGENCY_ROLE_PERMISSIONS.viewer.includes(AGENCY_PERMISSIONS.EXPENSES_APPROVE), false);
});

test("GET /api/v1/agencies/:agencyId/members requires authentication", async () => {
  const app = createApp();
  const response = await request(app).get("/api/v1/agencies/507f191e810c19729de860ea/members");

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});

test("invalid agencyId is rejected before service execution", async () => {
  const app = createApp();
  const response = await request(app).get("/api/v1/agencies/not-an-id/dashboard/summary");

  assert.equal(response.statusCode, 401);
});
