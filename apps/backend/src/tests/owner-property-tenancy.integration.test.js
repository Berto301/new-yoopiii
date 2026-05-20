import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Notification } from "../modules/notifications/notification.model.js";
import { OwnerRentPayment } from "../modules/owner/models/owner-rent-payment.model.js";
import { OwnerTenant } from "../modules/owner/models/owner-tenant.model.js";
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
    email: overrides.email || `user-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: overrides.role || "proprietaire",
    status: "active"
  });

const createRentalProperty = ({ owner, title }) =>
  Property.create({
    title,
    slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: `${title} description`,
    type: "house",
    purpose: "rent",
    price: 950000,
    currency: "USD",
    area: 120,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    features: [],
    address: `${title} address`,
    location: { type: "Point", coordinates: [47.03961, -19.872006] },
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "rented",
    publicationStatus: "approved"
  });

test("owner property tenancy workspace is scoped to one property and creates late-rent notifications once", async () => {
  const owner = await createUser();
  const tenantUser = await createUser({ role: "user", firstName: "Tina", lastName: "Tenant" });
  const property = await createRentalProperty({ owner, title: "Villa tenancy" });
  const otherProperty = await createRentalProperty({ owner, title: "Villa other" });
  const tenant = await OwnerTenant.create({
    ownerId: owner._id,
    managedPropertyId: property._id,
    linkedUserId: tenantUser._id,
    firstName: "Tina",
    lastName: "Tenant",
    fullName: "Tina Tenant",
    email: tenantUser.email,
    sexe: "femme"
  });
  const otherTenant = await OwnerTenant.create({
    ownerId: owner._id,
    managedPropertyId: otherProperty._id,
    firstName: "Other",
    lastName: "Tenant",
    fullName: "Other Tenant",
    email: "other-tenant@yopii.test",
    sexe: "homme"
  });

  await OwnerRentPayment.create([
    {
      ownerId: owner._id,
      tenantId: tenant._id,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      amount: 500,
      currency: "USD",
      status: "late"
    },
    {
      ownerId: owner._id,
      tenantId: tenant._id,
      dueDate: new Date("2026-05-01T00:00:00.000Z"),
      amount: 500,
      currency: "USD",
      status: "paid"
    },
    {
      ownerId: owner._id,
      tenantId: otherTenant._id,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      amount: 750,
      currency: "USD",
      status: "late"
    }
  ]);

  const app = createApp();
  const token = signAccessToken(owner);

  const response = await request(app)
    .get(`/api/v1/owner/properties/${property._id}/tenancy`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.tenants.length, 1);
  assert.equal(response.body.data.receipts.length, 2);
  assert.equal(response.body.data.dashboard.lateRents, 1);

  const notificationsAfterFirstRead = await Notification.find({
    type: { $in: ["owner.rent.late", "user.rent.late"] }
  }).lean();

  assert.equal(notificationsAfterFirstRead.length, 2);

  await request(app)
    .get(`/api/v1/owner/properties/${property._id}/tenancy`)
    .set("Authorization", `Bearer ${token}`);

  const notificationsAfterSecondRead = await Notification.find({
    type: { $in: ["owner.rent.late", "user.rent.late"] }
  }).lean();

  assert.equal(notificationsAfterSecondRead.length, 2);
});

test("owner cannot generate a receipt for another property from the selected property workspace", async () => {
  const owner = await createUser();
  const tenantUser = await createUser({ role: "user", firstName: "Rita", lastName: "Tenant" });
  const property = await createRentalProperty({ owner, title: "Receipt property" });
  const otherProperty = await createRentalProperty({ owner, title: "Receipt other property" });
  const tenant = await OwnerTenant.create({
    ownerId: owner._id,
    managedPropertyId: property._id,
    linkedUserId: tenantUser._id,
    firstName: "Rita",
    lastName: "Tenant",
    fullName: "Rita Tenant",
    email: tenantUser.email,
    sexe: "femme"
  });
  const otherTenant = await OwnerTenant.create({
    ownerId: owner._id,
    managedPropertyId: otherProperty._id,
    firstName: "Wrong",
    lastName: "Tenant",
    fullName: "Wrong Tenant",
    email: "wrong-tenant@yopii.test",
    sexe: "homme"
  });
  const [validPayment, otherPayment] = await OwnerRentPayment.create([
    {
      ownerId: owner._id,
      tenantId: tenant._id,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      amount: 500,
      currency: "USD",
      status: "paid"
    },
    {
      ownerId: owner._id,
      tenantId: otherTenant._id,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      amount: 750,
      currency: "USD",
      status: "paid"
    }
  ]);

  const app = createApp();
  const token = signAccessToken(owner);
  const forbiddenResponse = await request(app)
    .post(`/api/v1/owner/properties/${property._id}/receipts/${otherPayment._id}/generate`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(forbiddenResponse.statusCode, 404);

  const validResponse = await request(app)
    .post(`/api/v1/owner/properties/${property._id}/receipts/${validPayment._id}/generate`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(validResponse.statusCode, 200);
  assert.ok(validResponse.body.data.receiptNumber);

  const tenantNotification = await Notification.findOne({
    userId: tenantUser._id,
    type: "owner.receipt.generated"
  }).lean();

  assert.ok(tenantNotification);
});

test("tenant can download a receipt only after the owner approves the payment", async () => {
  const owner = await createUser();
  const tenantUser = await createUser({ role: "user", firstName: "Mira", lastName: "Tenant" });
  const property = await createRentalProperty({ owner, title: "Receipt download property" });
  const tenant = await OwnerTenant.create({
    ownerId: owner._id,
    managedPropertyId: property._id,
    linkedUserId: tenantUser._id,
    firstName: "Mira",
    lastName: "Tenant",
    fullName: "Mira Tenant",
    email: tenantUser.email,
    sexe: "femme"
  });
  const payment = await OwnerRentPayment.create({
    ownerId: owner._id,
    managedPropertyId: property._id,
    tenantId: tenant._id,
    dueDate: new Date("2026-05-01T00:00:00.000Z"),
    amount: 600,
    paidAmount: 600,
    currency: "USD",
    status: "pending_approval"
  });

  const app = createApp();
  const ownerToken = signAccessToken(owner);
  const tenantToken = signAccessToken(tenantUser);

  const blockedReceiptResponse = await request(app)
    .get(`/api/v1/user-assets/properties/rented/${tenant._id}/payments/${payment._id}/receipt`)
    .set("Authorization", `Bearer ${tenantToken}`);

  assert.equal(blockedReceiptResponse.statusCode, 400);

  const approvalResponse = await request(app)
    .post(`/api/v1/owner/rents/${payment._id}/approve`)
    .set("Authorization", `Bearer ${ownerToken}`);

  assert.equal(approvalResponse.statusCode, 200);
  assert.equal(approvalResponse.body.data.canDownloadReceipt, true);
  assert.ok(approvalResponse.body.data.receiptNumber);

  const receiptResponse = await request(app)
    .get(`/api/v1/user-assets/properties/rented/${tenant._id}/payments/${payment._id}/receipt`)
    .set("Authorization", `Bearer ${tenantToken}`);

  assert.equal(receiptResponse.statusCode, 200);
  assert.equal(receiptResponse.body.data.receiptNumber, approvalResponse.body.data.receiptNumber);
  assert.match(receiptResponse.body.data.content, /Preuve: paiement deja effectue/);
});
