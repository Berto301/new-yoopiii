import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Conversation } from "../modules/conversations/conversation.model.js";
import { Message } from "../modules/conversations/message.model.js";
import { Notification } from "../modules/notifications/notification.model.js";
import { Property } from "../modules/properties/property.model.js";
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
  assert.equal(updateMessageResponse.body.data.message.content, "Bonjour, le bien est-il toujours disponible ?");

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

test("appointment messages can be created by an agent and updated by the client with persisted notifications", async () => {
  const client = await createUser({ firstName: "Client", role: "user" });
  const agent = await createUser({ firstName: "Agent", role: "independent_agent" });
  const clientToken = signAccessToken(client);
  const agentToken = signAccessToken(agent);
  const app = createApp();
  const property = await Property.create({
    title: "Villa Analamahitsy",
    slug: "villa-analamahitsy",
    description: "Belle villa pour un achat rapide.",
    type: "house",
    purpose: "sale",
    price: 250000000,
    currency: "XOF",
    area: 180,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 2,
    features: [],
    address: "Analamahitsy",
    location: {
      type: "Point",
      coordinates: [47.543, -18.879]
    },
    status: "published",
    publicationStatus: "approved",
    ownerType: "independent_agent",
    agentId: agent._id
  });

  const createConversationResponse = await request(app)
    .post("/api/v1/conversations")
    .set("Authorization", `Bearer ${agentToken}`)
    .send({ participantId: String(client._id) });

  const conversationId = createConversationResponse.body.data.id;

  const appointmentPayload = {
    appointmentId: "appointment-001",
    propertyId: String(property._id),
    propertyTitle: "Villa Analamahitsy",
    propertyPurpose: "sale",
    conversationId,
    clientId: String(client._id),
    agentId: String(agent._id),
    status: "pending",
    date: "2026-04-10",
    startTime: "12:00",
    endTime: "12:30",
    visitFee: 25000,
    description: "Visite du bien principal",
    clientFeedback: "",
    clientTakesProperty: false,
    createdAt: new Date("2026-04-02T10:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-04-02T10:00:00.000Z").toISOString(),
    createdBy: String(agent._id),
    updatedBy: String(agent._id)
  };

  const sendAppointmentResponse = await request(app)
    .post(`/api/v1/conversations/${conversationId}/messages`)
    .set("Authorization", `Bearer ${agentToken}`)
    .send({
      content: "Rendez-vous planifie",
      messageType: "appointment",
      appointment: appointmentPayload,
      attachments: []
    });

  assert.equal(sendAppointmentResponse.statusCode, 201);
  assert.equal(sendAppointmentResponse.body.data.message.messageType, "appointment");
  assert.equal(sendAppointmentResponse.body.data.message.appointment.date, "2026-04-10");
  assert.equal(sendAppointmentResponse.body.data.message.appointment.propertyTitle, "Villa Analamahitsy");

  const messageId = sendAppointmentResponse.body.data.message.id;

  const updateAppointmentResponse = await request(app)
    .patch(`/api/v1/conversations/${conversationId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${clientToken}`)
    .send({
      content: "Rendez-vous planifie avec retour client",
      messageType: "appointment",
      appointment: {
        ...appointmentPayload,
        status: "closed_won",
        clientFeedback: "Je serai sur place a 11:55",
        clientTakesProperty: true,
        updatedAt: new Date("2026-04-02T11:00:00.000Z").toISOString(),
        updatedBy: String(client._id)
      }
    });

  assert.equal(updateAppointmentResponse.statusCode, 200);
  assert.equal(updateAppointmentResponse.body.data.message.appointment.clientFeedback, "Je serai sur place a 11:55");
  assert.equal(updateAppointmentResponse.body.data.message.appointment.clientTakesProperty, true);
  assert.equal(updateAppointmentResponse.body.data.message.appointment.status, "closed_won");

  const notifications = await Notification.find({ userId: agent._id }).sort({ createdAt: -1 }).lean();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, "appointment_closed_won");
  assert.equal(notifications[0].data.propertyTitle, "Villa Analamahitsy");
  assert.equal(notifications[0].data.appointmentStatus, "closed_won");

  const refreshedProperty = await Property.findById(property._id).lean();
  assert.equal(refreshedProperty.status, "sold");

  const listMessagesResponse = await request(app)
    .get(`/api/v1/conversations/${conversationId}/messages?page=1&limit=30`)
    .set("Authorization", `Bearer ${clientToken}`);

  assert.equal(listMessagesResponse.statusCode, 200);
  assert.equal(listMessagesResponse.body.data.items[0].appointment.clientFeedback, "Je serai sur place a 11:55");
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
