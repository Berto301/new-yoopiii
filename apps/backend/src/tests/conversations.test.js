import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken, verifyAccessToken } from "../core/utils/jwt.js";
import { conversationRoomName, userRoomName } from "../realtime/socket/rooms/room-names.js";

test("JWT helpers sign and verify an access token", () => {
  const token = signAccessToken({ _id: "507f191e810c19729de860ea", role: "user" });
  const payload = verifyAccessToken(token);

  assert.equal(payload.sub, "507f191e810c19729de860ea");
  assert.equal(payload.role, "user");
});

test("socket room names are stable", () => {
  assert.equal(userRoomName("user-1"), "user:user-1");
  assert.equal(conversationRoomName("conversation-1"), "conversation:conversation-1");
});

test("GET /api/v1/conversations requires authentication", async () => {
  const app = createApp();
  const response = await request(app).get("/api/v1/conversations");

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});

test("GET /api/v1/conversations/unread-count requires authentication", async () => {
  const app = createApp();
  const response = await request(app).get("/api/v1/conversations/unread-count");

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.success, false);
});
