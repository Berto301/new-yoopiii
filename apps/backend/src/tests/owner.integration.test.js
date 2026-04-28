import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Notification } from "../modules/notifications/notification.model.js";
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
    email: overrides.email || `owner-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: overrides.role || "proprietaire",
    status: "active"
  });

test("owner dashboard uses real data while workspace modules keep their seeded demo portfolio", async () => {
  const owner = await createUser();
  const token = signAccessToken(owner);
  const app = createApp();

  const dashboardResponse = await request(app)
    .get("/api/v1/owner/dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(dashboardResponse.statusCode, 200);
  assert.equal(dashboardResponse.body.data.summary.propertiesCount, 0);
  assert.equal(dashboardResponse.body.data.summary.tenantsCount, 0);
  assert.equal(dashboardResponse.body.data.summary.activeContractsCount, 0);
  assert.equal(dashboardResponse.body.data.alerts.length, 0);

  const [contractsResponse, rentsResponse, tenantsResponse, propertiesResponse, maintenanceResponse] = await Promise.all([
    request(app).get("/api/v1/owner/contracts").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/rents").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/tenants").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/properties").set("Authorization", `Bearer ${token}`),
    request(app).get("/api/v1/owner/maintenance").set("Authorization", `Bearer ${token}`)
  ]);

  assert.equal(contractsResponse.statusCode, 200);
  assert.equal(contractsResponse.body.data.length, 3);
  assert.equal(rentsResponse.body.data.length, 4);
  assert.equal(tenantsResponse.body.data.length, 3);
  assert.equal(propertiesResponse.body.data.length, 4);
  assert.equal(maintenanceResponse.body.data.length, 3);
});

test("owner workspace endpoints are forbidden for non proprietaire users", async () => {
  const user = await createUser({ role: "user" });
  const token = signAccessToken(user);
  const app = createApp();

  const response = await request(app)
    .get("/api/v1/owner/dashboard")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.statusCode, 403);
});

test("owner can create update and delete a maintenance ticket with notifications", async () => {
  const owner = await createUser();
  const token = signAccessToken(owner);
  const app = createApp();

  const property = await Property.create({
    title: "Residence maintenance",
    slug: `residence-maintenance-${Date.now()}`,
    description: "Bien suivi pour maintenance",
    type: "house",
    purpose: "rent",
    price: 1800000,
    currency: "Ar",
    area: 140,
    rooms: 5,
    bedrooms: 3,
    bathrooms: 2,
    features: [],
    address: "Ivandry",
    location: { type: "Point", coordinates: [47.52, -18.88] },
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "published",
    publicationStatus: "approved"
  });

  const createResponse = await request(app)
    .post("/api/v1/owner/maintenance")
    .set("Authorization", `Bearer ${token}`)
    .send({
      managedPropertyId: String(property._id),
      title: "Fuite terrasse",
      description: "Verifier l'evacuation des eaux pluviales.",
      priority: "high",
      assignee: "Hydro Tech",
      status: "in_progress",
      maintenanceAmount: 350000,
      currency: "usd",
      lastUpdateAt: "2026-04-19"
    });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.property, "Residence maintenance");
  assert.equal(createResponse.body.data.statusValue, "in_progress");
  assert.equal(createResponse.body.data.maintenanceAmount, 350000);
  assert.equal(createResponse.body.data.currency, "USD");

  const ticketId = createResponse.body.data.id;

  const updateResponse = await request(app)
    .patch(`/api/v1/owner/maintenance/${ticketId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      managedPropertyId: String(property._id),
      title: "Fuite terrasse resolue",
      description: "Intervention terminee et controle effectue.",
      priority: "medium",
      assignee: "Hydro Tech",
      status: "closed",
      maintenanceAmount: 425000,
      currency: "eur",
      lastUpdateAt: "2026-04-20"
    });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.body.data.title, "Fuite terrasse resolue");
  assert.equal(updateResponse.body.data.statusValue, "closed");
  assert.equal(updateResponse.body.data.maintenanceAmount, 425000);
  assert.equal(updateResponse.body.data.currency, "EUR");

  const deleteResponse = await request(app)
    .delete(`/api/v1/owner/maintenance/${ticketId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(deleteResponse.statusCode, 200);

  const maintenanceNotifications = await Notification.find({
    userId: owner._id,
    type: { $in: ["owner.maintenance.created", "owner.maintenance.updated", "owner.maintenance.deleted"] }
  }).lean();

  assert.equal(maintenanceNotifications.length, 3);
});

test("owner can create and update a tenant with user-prefilled profile fields", async () => {
  const owner = await createUser();
  const tenantUser = await createUser({
    role: "user",
    firstName: "Mickael",
    lastName: "Tenant",
    email: "mickael-tenant@yopii.test"
  });

  tenantUser.phone = "+261340000001";
  tenantUser.cin = "CIN-LOC-001";
  tenantUser.adresse = "Antsirabe Madagascar";
  tenantUser.sexe = "homme";
  await tenantUser.save();

  const token = signAccessToken(owner);
  const app = createApp();

  const property = await Property.create({
    title: "Appartement locatif",
    slug: `appartement-locatif-${Date.now()}`,
    description: "Bien locatif pour test locataire",
    type: "apartment",
    purpose: "rent",
    price: 950000,
    currency: "AR",
    area: 80,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    features: [],
    address: "Antsirabe centre",
    location: { type: "Point", coordinates: [47.03961, -19.872006] },
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "published",
    publicationStatus: "approved"
  });

  const createResponse = await request(app)
    .post("/api/v1/owner/tenants")
    .set("Authorization", `Bearer ${token}`)
    .send({
      linkedUserId: String(tenantUser._id),
      managedPropertyId: String(property._id),
      firstName: "Mickael",
      lastName: "Tenant",
      email: "mickael-tenant@yopii.test",
      phone: "+261340000001",
      cin: "CIN-LOC-001",
      adresse: "Antsirabe Madagascar",
      sexe: "homme"
    });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.fullName, "Mickael Tenant");
  assert.equal(createResponse.body.data.linkedUserId, String(tenantUser._id));
  assert.equal(createResponse.body.data.property, "Appartement locatif");

  const updateResponse = await request(app)
    .patch(`/api/v1/owner/tenants/${createResponse.body.data.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      linkedUserId: String(tenantUser._id),
      managedPropertyId: String(property._id),
      firstName: "Mickael",
      lastName: "Tenant",
      email: "mickael-tenant@yopii.test",
      phone: "+261340000099",
      cin: "CIN-LOC-999",
      adresse: "Antsirabe centre ville",
      sexe: "homme"
    });

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.body.data.phone, "+261340000099");
  assert.equal(updateResponse.body.data.cin, "CIN-LOC-999");

  const tenants = await OwnerTenant.find({ ownerId: owner._id }).lean();
  assert.equal(tenants.length, 1);
  assert.equal(tenants[0].adresse, "Antsirabe centre ville");
});

test("owner can delete a tenant and release the linked rental property", async () => {
  const owner = await createUser();
  const token = signAccessToken(owner);
  const app = createApp();

  const property = await Property.create({
    title: "Villa a liberer",
    slug: `villa-a-liberer-${Date.now()}`,
    description: "Bien locatif a liberer apres suppression du locataire",
    type: "house",
    purpose: "rent",
    price: 1450000,
    currency: "AR",
    area: 120,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    features: [],
    address: "Antananarivo",
    location: { type: "Point", coordinates: [47.5, -18.9] },
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "rented",
    publicationStatus: "approved"
  });

  const tenant = await OwnerTenant.create({
    ownerId: owner._id,
    managedPropertyId: property._id,
    firstName: "Sarah",
    lastName: "Tenant",
    fullName: "Sarah Tenant",
    email: "sarah-tenant@yopii.test",
    phone: "+261340001111",
    cin: "CIN-DEL-001",
    adresse: "Antananarivo",
    sexe: "femme",
    source: "manual"
  });

  const deleteResponse = await request(app)
    .delete(`/api/v1/owner/tenants/${tenant._id}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(deleteResponse.body.data.success, true);

  const [deletedTenant, refreshedProperty] = await Promise.all([
    OwnerTenant.findById(tenant._id).lean(),
    Property.findById(property._id).lean()
  ]);

  assert.equal(deletedTenant, null);
  assert.equal(refreshedProperty.status, "published");
  assert.equal(refreshedProperty.reservedByUserId, null);
});
