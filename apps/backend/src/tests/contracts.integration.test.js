import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Agency } from "../modules/agencies/agency.model.js";
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
    firstName: overrides.firstName || "Test",
    lastName: overrides.lastName || "User",
    email: overrides.email || `user-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: overrides.role || "user",
    status: "active",
    agencyId: overrides.agencyId || null
  });

test("agency can manage a property only while an active contract exists with the proprietaire", async () => {
  const today = new Date();
  const activeStartDate = new Date(today);
  activeStartDate.setDate(activeStartDate.getDate() - 1);
  const activeEndDate = new Date(today);
  activeEndDate.setMonth(activeEndDate.getMonth() + 6);
  const renewalDate = new Date(activeEndDate);
  renewalDate.setMonth(renewalDate.getMonth() - 1);

  const owner = await createUser({ firstName: "Owner", role: "proprietaire" });
  const agencyOwner = await createUser({ firstName: "Agency", role: "agency" });
  const agency = await Agency.create({
    name: "Contract Agency",
    slug: `contract-agency-${Date.now()}`,
    contactEmail: agencyOwner.email,
    contactPhone: "",
    ownerUserId: agencyOwner._id,
    status: "active"
  });

  agencyOwner.agencyId = agency._id;
  await agencyOwner.save();

  const token = signAccessToken(agencyOwner);
  const app = createApp();

  const createContractResponse = await request(app)
    .post("/api/v1/contracts")
    .set("Authorization", `Bearer ${token}`)
    .send({
      reference: "CTR-AG-001",
      contractType: "Mandat de gestion locative",
      status: "active",
      signatureDate: activeStartDate.toISOString(),
      startDate: activeStartDate.toISOString(),
      endDate: activeEndDate.toISOString(),
      renewalDate: renewalDate.toISOString(),
      ownerUserId: String(owner._id),
      mandateType: "Gestion complete",
      mission: "Gestion locative complete",
      commission: "8%",
      paymentConditions: "Mensuel",
      noticePeriod: "60 jours",
      terminationConditions: "Resiliation contractuelle",
      specialClauses: "",
      legalFramework: "Code civil",
      jurisdiction: "Antananarivo",
      propertyReference: "Residence Palmier",
      documentIds: []
    });

  assert.equal(createContractResponse.statusCode, 201);
  const contractId = createContractResponse.body.data.id;

  const createPropertyResponse = await request(app)
    .post("/api/v1/properties/management")
    .set("Authorization", `Bearer ${token}`)
    .send({
      managementContractId: contractId,
      title: "Residence Palmier",
      description: "Villa sous mandat actif avec proprietaire signe.",
      type: "house",
      purpose: "rent",
      price: 250000000,
      currency: "XOF",
      area: 220,
      rooms: 6,
      bedrooms: 4,
      bathrooms: 3,
      features: [],
      address: "Ivandry",
      location: { lat: 5.35, lng: -4.01, placeId: null },
      media: [],
      has3DView: false
    });

  assert.equal(createPropertyResponse.statusCode, 201);
  assert.equal(createPropertyResponse.body.data.managementContractId, contractId);

  const managedBeforeTermination = await request(app)
    .get("/api/v1/properties/management/mine")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(managedBeforeTermination.statusCode, 200);
  assert.equal(managedBeforeTermination.body.data.items.length, 1);

  const terminateContractResponse = await request(app)
    .patch(`/api/v1/contracts/${contractId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      status: "terminated"
    });

  assert.equal(terminateContractResponse.statusCode, 200);

  const managedAfterTermination = await request(app)
    .get("/api/v1/properties/management/mine")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(managedAfterTermination.statusCode, 200);
  assert.equal(managedAfterTermination.body.data.items.length, 0);
});

test("independent agent cannot create a managed property without an active contract", async () => {
  const agent = await createUser({ firstName: "Solo", role: "independent_agent" });
  const token = signAccessToken(agent);
  const app = createApp();

  const response = await request(app)
    .post("/api/v1/properties/management")
    .set("Authorization", `Bearer ${token}`)
    .send({
      managementContractId: "507f191e810c19729de860ea",
      title: "Bien sans contrat",
      description: "Tentative sans contrat reel actif.",
      type: "house",
      purpose: "rent",
      price: 90000000,
      currency: "XOF",
      area: 120,
      rooms: 4,
      bedrooms: 2,
      bathrooms: 2,
      features: [],
      address: "Cocody",
      location: { lat: 5.36, lng: -4.00, placeId: null },
      media: [],
      has3DView: false
    });

  assert.equal(response.statusCode, 404);
});

test("proprietaire keeps visibility and can create a property without contract assignment", async () => {
  const owner = await createUser({ firstName: "Owner", role: "proprietaire" });
  const token = signAccessToken(owner);
  const app = createApp();

  const createResponse = await request(app)
    .post("/api/v1/properties/management")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Bien proprietaire direct",
      description: "Bien gere directement par le proprietaire sans mandat actif rattache.",
      type: "house",
      purpose: "rent",
      price: 150000000,
      currency: "XOF",
      area: 145,
      rooms: 5,
      bedrooms: 3,
      bathrooms: 2,
      features: [],
      address: "Ambatobe",
      location: { lat: 5.37, lng: -4.02, placeId: null },
      media: [],
      has3DView: false
    });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.ownerType, "proprietaire");

  const listResponse = await request(app)
    .get("/api/v1/properties/management/mine")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.data.items.length, 1);
});
