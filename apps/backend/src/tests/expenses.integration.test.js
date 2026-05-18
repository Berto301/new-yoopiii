import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Conversation } from "../modules/conversations/conversation.model.js";
import { Message } from "../modules/conversations/message.model.js";
import { ManagementContract } from "../modules/contracts/management-contract.model.js";
import { Notification } from "../modules/notifications/notification.model.js";
import { OwnerMaintenanceTicket } from "../modules/owner/models/owner-maintenance-ticket.model.js";
import { OwnerRentPayment } from "../modules/owner/models/owner-rent-payment.model.js";
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

const createOwnerProperty = ({ owner, overrides = {} }) =>
  Property.create({
    title: overrides.title || "Residence finance",
    slug: overrides.slug || `residence-finance-${Date.now()}-${Math.random()}`,
    description: "Bien suivi pour depenses proprietaire",
    type: "apartment",
    purpose: overrides.purpose || "rent",
    price: overrides.price ?? 1500000,
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
    status: overrides.status || "published",
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
    maintenanceAmount: 275000,
    currency: "EUR",
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
  assert.equal(syncedResponse.body.data.items[0].amount, 275000);
  assert.equal(syncedResponse.body.data.items[0].currency, "EUR");
  assert.equal(syncedResponse.body.data.summary.totalExpenses, 275000);

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

test("owner expenses automatically sync approved rents, sale prices, contract charges, and visit fees", async () => {
  const owner = await createUser();
  const visitor = await createUser({ role: "user", email: `visitor-${Date.now()}-${Math.random()}@yopii.test` });
  const token = signAccessToken(owner);
  const rentProperty = await createOwnerProperty({ owner, overrides: { title: "Appartement loyer", slug: `appartement-loyer-${Date.now()}` } });
  const soldProperty = await createOwnerProperty({
    owner,
    overrides: {
      title: "Villa vendue",
      slug: `villa-vendue-${Date.now()}`,
      purpose: "sale",
      status: "sold",
      price: 3200000
    }
  });

  await OwnerRentPayment.create({
    ownerId: owner._id,
    managedPropertyId: rentProperty._id,
    dueDate: new Date("2026-05-01T00:00:00.000Z"),
    amount: 1500000,
    paidAmount: 1500000,
    currency: "MGA",
    status: "approved",
    paymentDate: new Date("2026-05-03T00:00:00.000Z"),
    approvedAt: new Date("2026-05-04T00:00:00.000Z"),
    receiptNumber: "Q-2026-LOYER"
  });

  await ManagementContract.create({
    reference: `CTR-EXP-${Date.now()}`,
    contractType: "agent",
    status: "active",
    startDate: new Date("2026-05-01T00:00:00.000Z"),
    endDate: new Date("2027-05-01T00:00:00.000Z"),
    ownerUserId: owner._id,
    managerUserId: owner._id,
    responsibleAgentUserId: owner._id,
    managerRole: "independent_agent",
    propertyId: rentProperty._id,
    financial: {
      rentAmount: 1500000,
      charges: 95000,
      deposit: 0,
      currency: "MGA",
      paymentFrequency: "monthly",
      paymentMethod: "cash"
    },
    createdByUserId: owner._id
  });

  const conversation = await Conversation.create({
    participantIds: [owner._id, visitor._id],
    propertyId: rentProperty._id,
    createdBy: owner._id
  });

  await Message.create({
    conversationId: conversation._id,
    senderId: owner._id,
    receiverId: visitor._id,
    content: "Rendez-vous avec droit de visite",
    messageType: "appointment",
    appointment: {
      appointmentId: "visit-fee-1",
      propertyId: String(rentProperty._id),
      propertyTitle: rentProperty.title,
      propertyPurpose: "rent",
      clientId: String(visitor._id),
      date: "2026-05-10",
      startTime: "09:00",
      endTime: "09:30",
      visitFee: 30000,
      status: "confirmed"
    }
  });

  const app = createApp();

  const assetResponse = await request(app)
    .get("/api/v1/expenses?type=actif")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(assetResponse.statusCode, 200);
  const assetSources = new Set(assetResponse.body.data.items.map((item) => item.source));
  const assetCategories = new Set(assetResponse.body.data.items.map((item) => item.category));

  assert.ok(assetSources.has("rent_payment"));
  assert.ok(assetSources.has("property"));
  assert.ok(assetSources.has("visit_fee"));
  assert.ok(assetCategories.has("rent_income"));
  assert.ok(assetCategories.has("sale_price"));
  assert.ok(assetCategories.has("visit_fee"));
  assert.equal(assetResponse.body.data.summary.totalIncome, 4730000);

  const chargeResponse = await request(app)
    .get("/api/v1/expenses?type=passif&category=other_charge")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(chargeResponse.statusCode, 200);
  assert.equal(chargeResponse.body.data.items.length, 1);
  assert.equal(chargeResponse.body.data.items[0].source, "contract");
  assert.equal(chargeResponse.body.data.items[0].amount, 95000);
});

test("expenses endpoints are forbidden for non proprietaire users", async () => {
  const user = await createUser({ role: "user" });
  const app = createApp();

  const response = await request(app)
    .get("/api/v1/expenses")
    .set("Authorization", `Bearer ${signAccessToken(user)}`);

  assert.equal(response.statusCode, 403);
});
