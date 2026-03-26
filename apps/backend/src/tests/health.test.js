import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

test("GET /api/v1/health returns success", async () => {
  const app = createApp();
  const response = await request(app).get("/api/v1/health");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
});

test("GET /api/v1/properties/search/nearby validates coordinates", async () => {
  const app = createApp();
  const response = await request(app).get("/api/v1/properties/search/nearby?lat=invalid&lng=-4.0083");

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed");
});
