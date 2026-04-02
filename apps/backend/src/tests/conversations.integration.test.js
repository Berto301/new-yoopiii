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

test("conversation lifecycle supports create, send, list, update, delete, read and unread count", async () => {
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
  const conversationId = createConversationResponse.body.data.id;

  const sendMessageResponse = await request(app)
    .post(`/api/v1/conversations/${conversationId}/messages`)
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ content: "Bonjour, le bien est-il disponible ?", messageType: "text", attachments: [] });

  assert.equal(sendMessageResponse.statusCode, 201);
  const messageId = sendMessageResponse.body.data.message.id;

  const updateMessageResponse = await request(app)
    .patch(`/api/v1/conversations/${conversationId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ content: "Bonjour, le bien est-il toujours disponible ?" });

  assert.equal(updateMessageResponse.statusCode, 200);
  assert.equal(updateMessageResponse.body.data.content, "Bonjour, le bien est-il toujours disponible ?");

  const listConversationsResponse = await request(app)
    .get("/api/v1/conversations")
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(listConversationsResponse.statusCode, 200);
  assert.equal(listConversationsResponse.body.data[0].lastMessagePreview, "Bonjour, le bien est-il toujours disponible ?");

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

  const readMessageResponse = await request(app)
    .patch(`/api/v1/conversations/${conversationId}/messages/${messageId}/read`)
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(readMessageResponse.statusCode, 200);
  assert.equal(readMessageResponse.body.data.status, "read");

  const deleteMessageResponse = await request(app)
    .delete(`/api/v1/conversations/${conversationId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${clientToken}`);

  assert.equal(deleteMessageResponse.statusCode, 200);
  assert.equal(deleteMessageResponse.body.data.deleted, true);

  const getMessagesAfterDeleteResponse = await request(app)
    .get(`/api/v1/conversations/${conversationId}/messages?page=1&limit=30`)
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(getMessagesAfterDeleteResponse.statusCode, 200);
  assert.equal(getMessagesAfterDeleteResponse.body.data.items.length, 0);
});

test("message update and delete are restricted to the sender", async () => {
  const client = await createUser({ firstName: "Client", role: "user" });
  const agent = await createUser({ firstName: "Agent", role: "independent_agent" });
  const clientToken = signAccessToken(client);
  const agentToken = signAccessToken(agent);
  const app = createApp();

  const createConversationResponse = await request(app)
    .post("/api/v1/conversations")
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ participantId: String(agent._id) });

  const conversationId = createConversationResponse.body.data.id;

  const sendMessageResponse = await request(app)
    .post(`/api/v1/conversations/${conversationId}/messages`)
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ content: "Bonjour", messageType: "text", attachments: [] });

  const messageId = sendMessageResponse.body.data.message.id;

  const forbiddenUpdate = await request(app)
    .patch(`/api/v1/conversations/${conversationId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${agentToken}`)
    .send({ content: "Non" });

  assert.equal(forbiddenUpdate.statusCode, 403);

  const forbiddenDelete = await request(app)
    .delete(`/api/v1/conversations/${conversationId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(forbiddenDelete.statusCode, 403);
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
  assert.equal(response.body.data.deletedConversationsCount, 2);
  assert.equal(response.body.data.deletedMessagesCount, 2);
});
