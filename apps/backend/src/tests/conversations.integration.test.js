import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Conversation } from "../modules/conversations/conversation.model.js";
import { Message } from "../modules/conversations/message.model.js";
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
  await Conversation.syncIndexes();
});

after(async () => {
  await disconnectTestDatabase();
});

const createUser = (overrides = {}) =>
  User.create({
    firstName: overrides.firstName || "Test",
    lastName: overrides.lastName || "User",
    email: overrides.email || `user-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: overrides.role || "user",
    status: "active"
  });

test("conversation lifecycle supports create, send, list, read and unread count", async () => {
  const client = await createUser({ firstName: "Client", role: "user" });
  const agent = await createUser({ firstName: "Agent", role: "independent_agent" });
  const clientToken = signAccessToken(client);
  const agentToken = signAccessToken(agent);
  const app = createApp();

  const createConversationResponse = await request(app)
    .post("/api/v1/conversations")
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ participantId: String(agent._id) });

  assert.equal(createConversationResponse.statusCode, 201);
  assert.equal(createConversationResponse.body.success, true);
  assert.equal(createConversationResponse.body.data.participantIds.length, 2);

  const conversationId = createConversationResponse.body.data.id;

  const sendMessageResponse = await request(app)
    .post(`/api/v1/conversations/${conversationId}/messages`)
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ content: "Bonjour, le bien est-il disponible ?", messageType: "text", attachments: [] });

  assert.equal(sendMessageResponse.statusCode, 201);
  assert.equal(sendMessageResponse.body.success, true);
  assert.equal(sendMessageResponse.body.data.message.status, "sent");

  const listConversationsResponse = await request(app)
    .get("/api/v1/conversations")
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(listConversationsResponse.statusCode, 200);
  assert.equal(listConversationsResponse.body.data.length, 1);
  assert.equal(listConversationsResponse.body.data[0].lastMessagePreview, "Bonjour, le bien est-il disponible ?");

  const unreadCountResponse = await request(app)
    .get("/api/v1/conversations/unread-count")
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(unreadCountResponse.statusCode, 200);
  assert.equal(unreadCountResponse.body.data.total, 1);

  const getMessagesResponse = await request(app)
    .get(`/api/v1/conversations/${conversationId}/messages?page=1&limit=30`)
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(getMessagesResponse.statusCode, 200);
  assert.equal(getMessagesResponse.body.data.items.length, 1);

  const messageId = getMessagesResponse.body.data.items[0].id;

  const readMessageResponse = await request(app)
    .patch(`/api/v1/conversations/${conversationId}/messages/${messageId}/read`)
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(readMessageResponse.statusCode, 200);
  assert.equal(readMessageResponse.body.data.status, "read");
  assert.ok(readMessageResponse.body.data.readAt);

  const unreadCountAfterReadResponse = await request(app)
    .get("/api/v1/conversations/unread-count")
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(unreadCountAfterReadResponse.statusCode, 200);
  assert.equal(unreadCountAfterReadResponse.body.data.total, 0);
});

test("conversation access is restricted to participants", async () => {
  const client = await createUser({ firstName: "Client", role: "user" });
  const agent = await createUser({ firstName: "Agent", role: "independent_agent" });
  const outsider = await createUser({ firstName: "Outsider", role: "user" });
  const clientToken = signAccessToken(client);
  const outsiderToken = signAccessToken(outsider);
  const app = createApp();

  const createConversationResponse = await request(app)
    .post("/api/v1/conversations")
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ participantId: String(agent._id) });

  const conversationId = createConversationResponse.body.data.id;

  const forbiddenResponse = await request(app)
    .get(`/api/v1/conversations/${conversationId}`)
    .set("Authorization", `Bearer ${outsiderToken}`);

  assert.equal(forbiddenResponse.statusCode, 403);
  assert.equal(forbiddenResponse.body.success, false);
});

test("deleting conversations with a participant removes all shared private conversations and messages", async () => {
  const client = await createUser({ firstName: "Client", role: "user" });
  const agent = await createUser({ firstName: "Agent", role: "independent_agent" });
  const clientToken = signAccessToken(client);
  const app = createApp();

  const firstConversation = await Conversation.create({
    type: "private",
    participantIds: [client._id, agent._id],
    createdBy: client._id,
    propertyId: null
  });

  const secondConversation = await Conversation.create({
    type: "private",
    participantIds: [client._id, agent._id],
    createdBy: agent._id,
    propertyId: null
  });

  await Message.create([
    {
      conversationId: firstConversation._id,
      senderId: client._id,
      receiverId: agent._id,
      content: "Bonjour 1",
      messageType: "text"
    },
    {
      conversationId: secondConversation._id,
      senderId: agent._id,
      receiverId: client._id,
      content: "Bonjour 2",
      messageType: "text"
    }
  ]);

  const response = await request(app)
    .delete(`/api/v1/conversations/with/${agent._id}`)
    .set("Authorization", `Bearer ${clientToken}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.deletedConversationsCount, 2);
  assert.equal(response.body.data.deletedMessagesCount, 2);
  assert.equal(await Conversation.countDocuments({}), 0);
  assert.equal(await Message.countDocuments({}), 0);
});
