import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { Agency } from "../modules/agencies/agency.model.js";
import { AgencyCalendarEvent } from "../modules/agencies/models/agency-calendar-event.model.js";
import { AgencyExpense } from "../modules/agencies/models/agency-expense.model.js";
import { AgencyMember } from "../modules/agencies/models/agency-member.model.js";
import { AgencyStatsSnapshot } from "../modules/agencies/models/agency-stats-snapshot.model.js";
import { RoleTemplate } from "../modules/agencies/models/role-template.model.js";
import { Booking } from "../modules/bookings/booking.model.js";
import { Conversation } from "../modules/conversations/conversation.model.js";
import { Message } from "../modules/conversations/message.model.js";
import { Notification } from "../modules/notifications/notification.model.js";
import { PropertyFavorite } from "../modules/properties/models/property-favorite.model.js";
import { PropertyView } from "../modules/properties/models/property-view.model.js";
import { Property } from "../modules/properties/property.model.js";
import { User } from "../modules/users/user.model.js";
import { signAccessToken } from "../core/utils/jwt.js";
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

test("agency dashboard summary returns real aggregates", async () => {
  const owner = await User.create({
    firstName: "Owner",
    lastName: "Agency",
    email: "owner@yopii.test",
    passwordHash: "hashed-password",
    role: "agency",
    status: "active"
  });

  const agentUser = await User.create({
    firstName: "Agent",
    lastName: "Team",
    email: "agent@yopii.test",
    passwordHash: "hashed-password",
    role: "agency_agent",
    status: "active"
  });

  const agency = await Agency.create({
    name: "Yopii Agency",
    slug: "yopii-agency",
    contactEmail: "agency@yopii.test",
    ownerUserId: owner._id
  });

  await AgencyMember.create({
    agencyId: agency._id,
    userId: agentUser._id,
    role: "agent",
    permissions: [],
    status: "active"
  });

  await Property.create({
    title: "Villa Cocody",
    slug: "villa-cocody",
    description: "Belle villa",
    type: "house",
    purpose: "sale",
    price: 150000000,
    area: 250,
    address: "Cocody",
    location: { type: "Point", coordinates: [-4.01, 5.35] },
    ownerType: "agency",
    agentId: agentUser._id,
    agencyId: agency._id,
    status: "published",
    publicationStatus: "approved"
  });

  await Booking.create({
    propertyId: new Property()._id,
    userId: owner._id,
    agentId: agentUser._id,
    agencyId: agency._id,
    requestedDate: new Date(),
    timeSlot: "15:00",
    status: "completed"
  });

  await AgencyCalendarEvent.create({
    agencyId: agency._id,
    agentId: agentUser._id,
    title: "Visite client",
    type: "visit",
    startAt: new Date(Date.now() + 86_400_000),
    endAt: new Date(Date.now() + 90_000_000),
    createdBy: owner._id
  });

  await AgencyExpense.create({
    agencyId: agency._id,
    label: "Campagne Meta Ads",
    category: "marketing",
    amount: 250000,
    expenseDate: new Date(),
    status: "approved",
    createdBy: owner._id,
    approvedBy: owner._id
  });

  const token = signAccessToken(owner);
  const app = createApp();
  const response = await request(app)
    .get(`/api/v1/agencies/${agency._id}/dashboard/summary`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.activeAgents, 1);
  assert.equal(response.body.data.activeProperties, 1);
  assert.equal(response.body.data.totalBookings, 1);
  assert.equal(response.body.data.completedBookings, 1);
  assert.equal(response.body.data.upcomingEvents, 1);
  assert.equal(response.body.data.currentMonthExpensesTotal, 250000);
  assert.equal(response.body.data.expenseBreakdown[0].category, "marketing");
});

test("agency owner can delete the agency with cascade cleanup", async () => {
  const owner = await User.create({
    firstName: "Owner",
    lastName: "Agency",
    email: "owner-delete@yopii.test",
    passwordHash: "hashed-password",
    role: "agency",
    status: "active"
  });

  const agentUser = await User.create({
    firstName: "Agent",
    lastName: "Delete",
    email: "agent-delete@yopii.test",
    passwordHash: "hashed-password",
    role: "agency_agent",
    status: "active",
    agencyId: null
  });

  const clientUser = await User.create({
    firstName: "Client",
    lastName: "Keep",
    email: "client-keep@yopii.test",
    passwordHash: "hashed-password",
    role: "user",
    status: "active"
  });

  const agency = await Agency.create({
    name: "Delete Agency",
    slug: "delete-agency",
    contactEmail: "delete-agency@yopii.test",
    ownerUserId: owner._id
  });

  owner.agencyId = agency._id;
  await owner.save();
  agentUser.agencyId = agency._id;
  await agentUser.save();

  await AgencyMember.create({
    agencyId: agency._id,
    userId: owner._id,
    role: "owner",
    permissions: [],
    status: "active",
    invitedBy: owner._id
  });

  await AgencyMember.create({
    agencyId: agency._id,
    userId: agentUser._id,
    role: "agent",
    permissions: [],
    status: "active",
    invitedBy: owner._id
  });

  const property = await Property.create({
    title: "Immeuble Plateau",
    slug: "immeuble-plateau",
    description: "Immeuble commercial",
    type: "commercial",
    purpose: "rent",
    price: 3500000,
    area: 600,
    address: "Plateau",
    location: { type: "Point", coordinates: [-4.0267, 5.3197] },
    ownerType: "agency",
    agentId: agentUser._id,
    agencyId: agency._id,
    status: "published",
    publicationStatus: "approved"
  });

  await Booking.create({
    propertyId: property._id,
    userId: clientUser._id,
    agentId: agentUser._id,
    agencyId: agency._id,
    requestedDate: new Date(),
    timeSlot: "11:30",
    status: "pending"
  });

  await AgencyCalendarEvent.create({
    agencyId: agency._id,
    agentId: agentUser._id,
    title: "Meeting",
    type: "meeting",
    startAt: new Date(Date.now() + 86_400_000),
    endAt: new Date(Date.now() + 90_000_000),
    createdBy: owner._id
  });

  await AgencyExpense.create({
    agencyId: agency._id,
    label: "Transport",
    category: "transport",
    amount: 50000,
    expenseDate: new Date(),
    status: "pending",
    createdBy: owner._id
  });

  await AgencyStatsSnapshot.create({
    agencyId: agency._id,
    periodType: "monthly",
    periodStart: new Date("2026-03-01T00:00:00.000Z"),
    periodEnd: new Date("2026-03-31T23:59:59.999Z"),
    activeAgents: 1
  });

  await RoleTemplate.create({
    agencyId: agency._id,
    name: "Agent terrain",
    key: "agent-terrain",
    permissions: ["members:read"],
    createdBy: owner._id
  });

  await Notification.create({
    userId: owner._id,
    type: "agency_update",
    title: "Owner notification",
    body: "Owner"
  });

  await Notification.create({
    userId: agentUser._id,
    type: "agency_update",
    title: "Agent notification",
    body: "Agent"
  });

  const conversation = await Conversation.create({
    participantIds: [agentUser._id, clientUser._id],
    propertyId: property._id,
    createdBy: clientUser._id,
    lastMessagePreview: "Bonjour",
    lastMessageAt: new Date()
  });

  await Message.create({
    conversationId: conversation._id,
    senderId: clientUser._id,
    receiverId: agentUser._id,
    content: "Bonjour"
  });

  await PropertyFavorite.create({
    userId: clientUser._id,
    propertyId: property._id
  });

  await PropertyView.create({
    userId: clientUser._id,
    propertyId: property._id,
    source: "detail"
  });

  const token = signAccessToken(owner);
  const app = createApp();
  const response = await request(app)
    .delete(`/api/v1/agencies/${agency._id}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(await Agency.countDocuments({ _id: agency._id }), 0);
  assert.equal(await AgencyMember.countDocuments({ agencyId: agency._id }), 0);
  assert.equal(await RoleTemplate.countDocuments({ agencyId: agency._id }), 0);
  assert.equal(await AgencyCalendarEvent.countDocuments({ agencyId: agency._id }), 0);
  assert.equal(await AgencyExpense.countDocuments({ agencyId: agency._id }), 0);
  assert.equal(await AgencyStatsSnapshot.countDocuments({ agencyId: agency._id }), 0);
  assert.equal(await Property.countDocuments({ agencyId: agency._id }), 0);
  assert.equal(await Booking.countDocuments({ agencyId: agency._id }), 0);
  assert.equal(await Notification.countDocuments({ userId: { $in: [owner._id, agentUser._id] } }), 0);
  assert.equal(await Conversation.countDocuments({ _id: conversation._id }), 0);
  assert.equal(await Message.countDocuments({ conversationId: conversation._id }), 0);
  assert.equal(await PropertyFavorite.countDocuments({ propertyId: property._id }), 0);
  assert.equal(await PropertyView.countDocuments({ propertyId: property._id }), 0);
  assert.equal(await User.countDocuments({ _id: owner._id }), 0);
  assert.equal(await User.countDocuments({ _id: agentUser._id }), 0);
  assert.equal(await User.countDocuments({ _id: clientUser._id }), 1);
});


