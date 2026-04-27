import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Notification } from "../modules/notifications/notification.model.js";
import { OwnerMaintenanceTicket } from "../modules/owner/models/owner-maintenance-ticket.model.js";
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
});

after(async () => {
  await disconnectTestDatabase();
});

const createUser = (overrides = {}) =>
  User.create({
    firstName: overrides.firstName || "Owner",
    lastName: overrides.lastName || "User",
    email: overrides.email || `expense-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: overrides.role || "proprietaire",
    status: "active"
  });

const createOwnerProperty = ({ owner }) =>
  Property.create({
    title: "Residence finance",
    slug: `residence-finance-${Date.now()}-${Math.random()}`,
    description: "Bien suivi pour depenses proprietaire",
    type: "apartment",
    purpose: "rent",
    price: 1500000,
    currency: "MGA",
    area: 90,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    features: [],
    address: "Antananarivo",
    location: { type: "Point", coordinates: [47.52, -18.88] },
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "published",
    publicationStatus: "approved"
  });

test("owner expenses CRUD supports filters, totals, maintenance sync, and notifications", async () => {
  const owner = await createUser();
  const token = signAccessToken(owner);
  const property = await createOwnerProperty({ owner });

  await OwnerMaintenanceTicket.create({
    ownerId: owner._id,
    managedPropertyId: property._id,
    propertyLabel: property.title,
    title: "Peinture facade",
    description: "Intervention liee au bien.",
    priority: "medium",
    assignee: "Batipro",
    status: "in_progress",
    lastUpdateAt: new Date("2026-04-12T00:00:00.000Z"),
    lastUpdateLabel: "12 avril 2026"
  });

  const app = createApp();

  const syncedResponse = await request(app)
    .get(`/api/v1/expenses?year=2026&month=4&type=passif&propertyId=${property._id}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(syncedResponse.statusCode, 200);
  assert.equal(syncedResponse.body.data.items.length, 1);
  assert.equal(syncedResponse.body.data.items[0].source, "maintenance");
  assert.equal(syncedResponse.body.data.items[0].category, "maintenance");

  const createResponse = await request(app)
    .post("/api/v1/expenses")
    .set("Authorization", `Bearer ${token}`)
    .send({
      propertyId: String(property._id),
      label: "Loyer avril",
      category: "rent_income",
      type: "passif",
      amount: 1200000,
      currency: "MGA",
      expenseDate: "2026-04-05",
      budgetAmount: 1000000,
      description: "Paiement locatif du mois"
    });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.type, "actif");
  assert.equal(createResponse.body.data.isBudgetExceeded, true);

  const assetResponse = await request(app)
    .get(`/api/v1/expenses?year=2026&month=4&type=actif&propertyId=${property._id}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(assetResponse.statusCode, 200);
  assert.equal(assetResponse.body.data.items.length, 1);
  assert.equal(assetResponse.body.data.summary.totalIncome, 1200000);
  assert.equal(assetResponse.body.data.summary.totalExpenses, 0);

  const updateResponse = await request(app)
    .put(`/api/v1/expenses/${createResponse.body.data.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      propertyId: String(property._id),
      label: "Frais administratifs",
      category: "administrative",
      type: "actif",
      amount: 130000,
      currency: "MGA",
      expenseDate: "2026-04-08",
      budgetAmount: 100000,
      description: "Dossier administratif"
    });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.body.data.type, "passif");

  const deleteResponse = await request(app)
    .delete(`/api/v1/expenses/${createResponse.body.data.id}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(deleteResponse.body.data.success, true);

  const notifications = await Notification.find({
    userId: owner._id,
    type: { $in: ["owner.expense.created", "owner.expense.updated", "owner.expense.deleted", "owner.expense.budget_exceeded"] }
  }).lean();

  assert.ok(notifications.some((notification) => notification.type === "owner.expense.created"));
  assert.ok(notifications.some((notification) => notification.type === "owner.expense.updated"));
  assert.ok(notifications.some((notification) => notification.type === "owner.expense.deleted"));
  assert.ok(notifications.some((notification) => notification.type === "owner.expense.budget_exceeded"));
});

test("expenses endpoints are forbidden for non proprietaire users", async () => {
  const user = await createUser({ role: "user" });
  const app = createApp();

  const response = await request(app)
    .get("/api/v1/expenses")
    .set("Authorization", `Bearer ${signAccessToken(user)}`);

  assert.equal(response.statusCode, 403);
});
