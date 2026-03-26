import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { Agency } from "../modules/agencies/agency.model.js";
import { AgencyCalendarEvent } from "../modules/agencies/models/agency-calendar-event.model.js";
import { AgencyExpense } from "../modules/agencies/models/agency-expense.model.js";
import { AgencyMember } from "../modules/agencies/models/agency-member.model.js";
import { Booking } from "../modules/bookings/booking.model.js";
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
