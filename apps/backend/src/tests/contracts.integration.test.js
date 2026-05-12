import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Agency } from "../modules/agencies/agency.model.js";
import { ManagementContract } from "../modules/contracts/management-contract.model.js";
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
    firstName: overrides.firstName || "Test",
    lastName: overrides.lastName || "User",
    email: overrides.email || `user-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: overrides.role || "user",
    status: "active",
    agencyId: overrides.agencyId || null
  });

test("agency can manage a property only after accepting a contract created by the proprietaire", async () => {
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

  const ownerToken = signAccessToken(owner);
  const agencyToken = signAccessToken(agencyOwner);
  const app = createApp();

  const createContractResponse = await request(app)
    .post("/api/v1/contracts")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      reference: "CTR-AG-001",
      contractType: "agency",
      status: "active",
      signatureDate: activeStartDate.toISOString(),
      startDate: activeStartDate.toISOString(),
      endDate: activeEndDate.toISOString(),
      renewalDate: renewalDate.toISOString(),
      ownerUserId: String(owner._id),
      agencyId: String(agency._id),
      agency: {
        id: String(agency._id),
        name: agency.name,
        commission: 8,
        fees: 0
      },
      financial: {
        rentAmount: 350000,
        charges: 0,
        deposit: 0,
        currency: "XOF",
        paymentFrequency: "monthly",
        paymentMethod: "Virement"
      },
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
  assert.equal(createContractResponse.body.data.status, "pending_signature");

  const createPropertyBeforeAcceptResponse = await request(app)
    .post("/api/v1/properties/management")
    .set("Authorization", `Bearer ${agencyToken}`)
    .send({
      managementContractId: contractId,
      title: "Residence Palmier",
      description: "Villa sous mandat en attente d'acceptation.",
      type: "house",
      purpose: "rent",
      price: 250000000,
      currency: "AR",
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

  assert.equal(createPropertyBeforeAcceptResponse.statusCode, 403);

  const acceptContractResponse = await request(app)
    .patch(`/api/v1/contracts/${contractId}`)
    .set("Authorization", `Bearer ${agencyToken}`)
    .send({
      status: "accepted"
    });

  assert.equal(acceptContractResponse.statusCode, 200);

  const createPropertyResponse = await request(app)
    .post("/api/v1/properties/management")
    .set("Authorization", `Bearer ${agencyToken}`)
    .send({
      managementContractId: contractId,
      title: "Residence Palmier",
      description: "Villa sous mandat actif avec proprietaire signe.",
      type: "house",
      purpose: "rent",
      price: 250000000,
      currency: "AR",
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
    .set("Authorization", `Bearer ${agencyToken}`);

  assert.equal(managedBeforeTermination.statusCode, 200);
  assert.equal(managedBeforeTermination.body.data.items.length, 1);

  const terminateContractResponse = await request(app)
    .patch(`/api/v1/contracts/${contractId}`)
    .set("Authorization", `Bearer ${agencyToken}`)
    .send({
      status: "terminated"
    });

  assert.equal(terminateContractResponse.statusCode, 200);

  const managedAfterTermination = await request(app)
    .get("/api/v1/properties/management/mine")
    .set("Authorization", `Bearer ${agencyToken}`);

  assert.equal(managedAfterTermination.statusCode, 200);
  assert.equal(managedAfterTermination.body.data.items.length, 0);
});

test("agency and responsible agency agent see properties linked to accepted contracts by propertyId", async () => {
  const now = new Date();
  const futureStartDate = new Date(now);
  futureStartDate.setMonth(futureStartDate.getMonth() + 1);
  const futureEndDate = new Date(futureStartDate);
  futureEndDate.setFullYear(futureEndDate.getFullYear() + 1);

  const owner = await createUser({ firstName: "Owner", role: "proprietaire" });
  const agencyOwner = await createUser({ firstName: "Agency", role: "agency" });
  const responsibleAgent = await createUser({ firstName: "Resp", lastName: "Agent", role: "agency_agent" });
  const otherAgent = await createUser({ firstName: "Other", lastName: "Agent", role: "agency_agent" });
  const agency = await Agency.create({
    name: "Accepted Agency",
    slug: `accepted-agency-${Date.now()}`,
    contactEmail: agencyOwner.email,
    contactPhone: "",
    ownerUserId: agencyOwner._id,
    status: "active"
  });

  agencyOwner.agencyId = agency._id;
  responsibleAgent.agencyId = agency._id;
  otherAgent.agencyId = agency._id;
  await Promise.all([agencyOwner.save(), responsibleAgent.save(), otherAgent.save()]);

  const property = await Property.create({
    title: "Bien accepte propertyId",
    slug: `bien-accepte-propertyid-${Date.now()}`,
    description: "Bien proprietaire lie par propertyId sur un contrat accepte.",
    type: "house",
    purpose: "rent",
    price: 120000,
    currency: "AR",
    area: 90,
    rooms: 4,
    bedrooms: 2,
    bathrooms: 1,
    features: [],
    address: "Ivandry",
    location: { type: "Point", coordinates: [-4.0, 5.3] },
    status: "draft",
    publicationStatus: "pending",
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id
  });

  const contract = await ManagementContract.create({
    reference: "CTR-ACCEPTED-PROPERTYID",
    contractType: "agency",
    status: "accepted",
    startDate: futureStartDate,
    endDate: futureEndDate,
    ownerUserId: owner._id,
    agencyId: agency._id,
    responsibleAgentUserId: responsibleAgent._id,
    managerRole: "agency",
    propertyId: property._id,
    agency: {
      id: agency._id,
      name: agency.name,
      commission: 8,
      fees: 0
    },
    agent: {
      id: responsibleAgent._id,
      name: "Resp Agent",
      commission: 0,
      fees: 0
    },
    financial: {
      rentAmount: 120000,
      charges: 0,
      deposit: 0,
      currency: "AR",
      paymentFrequency: "monthly",
      paymentMethod: "bank_transfer"
    },
    actions: {
      canPublishProperty: true,
      canReserveProperty: true,
      canEditProperty: true,
      canDeleteProperty: false
    },
    createdByUserId: owner._id
  });

  const app = createApp();

  const activeContractsResponse = await request(app)
    .get("/api/v1/contracts/active")
    .set("Authorization", `Bearer ${signAccessToken(agencyOwner)}`);

  assert.equal(activeContractsResponse.statusCode, 200);
  assert.equal(activeContractsResponse.body.data.length, 1);
  assert.equal(activeContractsResponse.body.data[0].id, String(contract._id));
  assert.equal(activeContractsResponse.body.data[0].status, "accepted");

  const agencyManagedResponse = await request(app)
    .get("/api/v1/properties/management/mine")
    .set("Authorization", `Bearer ${signAccessToken(agencyOwner)}`);

  assert.equal(agencyManagedResponse.statusCode, 200);
  assert.equal(agencyManagedResponse.body.data.items.length, 1);
  assert.equal(agencyManagedResponse.body.data.summary.total, 1);
  assert.equal(agencyManagedResponse.body.data.items[0].id, String(property._id));
  assert.equal(agencyManagedResponse.body.data.items[0].managementContractId, String(contract._id));
  assert.equal(agencyManagedResponse.body.data.items[0].managementContract.status, "accepted");
  assert.equal(agencyManagedResponse.body.data.items[0].managementContract.responsibleAgent.id, String(responsibleAgent._id));

  const responsibleManagedResponse = await request(app)
    .get("/api/v1/properties/management/mine?scope=agency")
    .set("Authorization", `Bearer ${signAccessToken(responsibleAgent)}`);

  assert.equal(responsibleManagedResponse.statusCode, 200);
  assert.equal(responsibleManagedResponse.body.data.items.length, 1);
  assert.equal(responsibleManagedResponse.body.data.summary.total, 1);

  const otherAgentManagedResponse = await request(app)
    .get("/api/v1/properties/management/mine?scope=agency")
    .set("Authorization", `Bearer ${signAccessToken(otherAgent)}`);

  assert.equal(otherAgentManagedResponse.statusCode, 200);
  assert.equal(otherAgentManagedResponse.body.data.items.length, 0);
  assert.equal(otherAgentManagedResponse.body.data.summary.total, 0);
});

test("independent agent sees properties linked to accepted contracts by propertyId", async () => {
  const now = new Date();
  const futureStartDate = new Date(now);
  futureStartDate.setMonth(futureStartDate.getMonth() + 1);
  const futureEndDate = new Date(futureStartDate);
  futureEndDate.setFullYear(futureEndDate.getFullYear() + 1);

  const owner = await createUser({ firstName: "Owner", role: "proprietaire" });
  const agent = await createUser({ firstName: "Solo", role: "independent_agent" });
  const property = await Property.create({
    title: "Bien accepte independant",
    slug: `bien-accepte-independant-${Date.now()}`,
    description: "Bien proprietaire lie a un agent independant par contrat accepte.",
    type: "apartment",
    purpose: "rent",
    price: 95000,
    currency: "AR",
    area: 75,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    features: [],
    address: "Analamahitsy",
    location: { type: "Point", coordinates: [-4.02, 5.31] },
    status: "draft",
    publicationStatus: "pending",
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id
  });

  const contract = await ManagementContract.create({
    reference: "CTR-INDEPENDENT-ACCEPTED",
    contractType: "agent",
    status: "accepted",
    startDate: futureStartDate,
    endDate: futureEndDate,
    ownerUserId: owner._id,
    managerUserId: agent._id,
    managerRole: "independent_agent",
    propertyId: property._id,
    agent: {
      id: agent._id,
      name: "Solo Agent",
      commission: 0,
      fees: 0
    },
    financial: {
      rentAmount: 95000,
      charges: 0,
      deposit: 0,
      currency: "AR",
      paymentFrequency: "monthly",
      paymentMethod: "bank_transfer"
    },
    actions: {
      canPublishProperty: true,
      canReserveProperty: true,
      canEditProperty: true,
      canDeleteProperty: false
    },
    createdByUserId: owner._id
  });

  const app = createApp();
  const managedResponse = await request(app)
    .get("/api/v1/properties/management/mine")
    .set("Authorization", `Bearer ${signAccessToken(agent)}`);

  assert.equal(managedResponse.statusCode, 200);
  assert.equal(managedResponse.body.data.items.length, 1);
  assert.equal(managedResponse.body.data.summary.total, 1);
  assert.equal(managedResponse.body.data.items[0].id, String(property._id));
  assert.equal(managedResponse.body.data.items[0].managementContractId, String(contract._id));
  assert.equal(managedResponse.body.data.items[0].managementContract.status, "accepted");
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
      currency: "AR",
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
      currency: "AR",
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

test("3D tour stores only an external pre-generated link", async () => {
  const owner = await createUser({ firstName: "Owner", role: "proprietaire" });
  const token = signAccessToken(owner);
  const app = createApp();
  const threeDUrl = "https://www.youtube.com/watch?v=visite-yopii-3d";

  const createResponse = await request(app)
    .post("/api/v1/properties/management")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Bien visite 3D",
      description: "Bien avec une visite 3D deja preparee sur une plateforme externe.",
      type: "house",
      purpose: "sale",
      price: 175000000,
      currency: "AR",
      area: 180,
      rooms: 5,
      bedrooms: 3,
      bathrooms: 2,
      features: ["Parking"],
      address: "Alarobia",
      location: { lat: 5.37, lng: -4.01, placeId: null },
      coverImage: "/uploads/properties/cover-tour.jpg",
      media: [
        {
          type: "image",
          url: "/uploads/properties/salon-tour.jpg",
          thumbnailUrl: "/uploads/properties/salon-tour.jpg",
          order: 0
        },
        {
          type: "image",
          url: "https://cdn.example.com/terrasse.jpg",
          thumbnailUrl: "https://cdn.example.com/terrasse-thumb.jpg",
          order: 1
        }
      ],
      is3DEnabled: true,
      has3DView: true,
      threeDUrl
    });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.data.is3DEnabled, true);
  assert.equal(createResponse.body.data.has3DView, true);
  assert.equal(createResponse.body.data.threeDStatus, "generated");
  assert.equal(createResponse.body.data.threeDUrl, threeDUrl);
  assert.equal(createResponse.body.data.threeDGeneratedAt, null);
  assert.deepEqual(createResponse.body.data.threeDSourceMedia, []);

  const propertyId = createResponse.body.data.id;

  const generationResponse = await request(app)
    .post(`/api/v1/properties/management/${propertyId}/three-d/generate`)
    .set("Authorization", `Bearer ${token}`)
    .send({ force: true });

  assert.equal(generationResponse.statusCode, 404);

  const storedProperty = await Property.findById(propertyId).lean();
  assert.equal(storedProperty.is3DEnabled, true);
  assert.equal(storedProperty.has3DView, true);
  assert.equal(storedProperty.threeDStatus, "generated");
  assert.equal(storedProperty.threeDUrl, threeDUrl);
  assert.equal(storedProperty.threeDGeneratedAt, null);
  assert.deepEqual(storedProperty.threeDSourceMedia, []);
});

test("owner deleting a contract keeps linked properties and detaches them", async () => {
  const today = new Date();
  const owner = await createUser({ firstName: "Owner", role: "proprietaire" });
  const agencyOwner = await createUser({ firstName: "Agency", role: "agency" });
  const agency = await Agency.create({
    name: "Delete Agency",
    slug: `delete-agency-${Date.now()}`,
    contactEmail: agencyOwner.email,
    contactPhone: "",
    ownerUserId: agencyOwner._id,
    status: "active"
  });

  agencyOwner.agencyId = agency._id;
  await agencyOwner.save();

  const ownerToken = signAccessToken(owner);
  const app = createApp();

  const createContractResponse = await request(app)
    .post("/api/v1/contracts")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      reference: "CTR-DELETE-001",
      contractType: "agency",
      status: "draft",
      startDate: today.toISOString(),
      endDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      ownerUserId: String(owner._id),
      agencyId: String(agency._id),
      agency: {
        id: String(agency._id),
        name: agency.name,
        commission: 8,
        fees: 0
      },
      financial: {
        rentAmount: 250000,
        charges: 0,
        deposit: 0,
        currency: "XOF",
        paymentFrequency: "monthly",
        paymentMethod: "bank_transfer"
      }
    });

  assert.equal(createContractResponse.statusCode, 201);
  const contractId = createContractResponse.body.data.id;

  const property = await Property.create({
    title: "Bien a supprimer",
    slug: `bien-a-supprimer-${Date.now()}`,
    description: "Bien lie au contrat",
    type: "house",
    purpose: "rent",
    price: 100000,
    currency: "AR",
    area: 80,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    features: [],
    address: "Analamahitsy",
    location: { type: "Point", coordinates: [-4.0, 5.3] },
    coverImage: null,
    media: [],
    has3DView: false,
    threeDUrl: null,
    status: "draft",
    publicationStatus: "pending",
    ownerType: "agency",
    ownerUserId: owner._id,
    managementContractId: contractId,
    agentId: agencyOwner._id,
    agencyId: agency._id
  });

  const deleteResponse = await request(app)
    .delete(`/api/v1/contracts/${contractId}`)
    .set("Authorization", `Bearer ${ownerToken}`);

  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(await ManagementContract.countDocuments({ _id: contractId }), 0);

  const updatedProperty = await Property.findById(property._id).lean();

  assert.ok(updatedProperty);
  assert.equal(updatedProperty.managementContractId, null);
  assert.equal(updatedProperty.ownerType, "proprietaire");
  assert.equal(String(updatedProperty.ownerUserId), String(owner._id));
  assert.equal(updatedProperty.agencyId, null);
  assert.equal(String(updatedProperty.agentId), String(owner._id));
});

test("agency deleting a contract keeps linked properties and detaches them", async () => {
  const today = new Date();
  const owner = await createUser({ firstName: "Owner", role: "proprietaire" });
  const agencyOwner = await createUser({ firstName: "Agency", role: "agency" });
  const agency = await Agency.create({
    name: "Detach Agency",
    slug: `detach-agency-${Date.now()}`,
    contactEmail: agencyOwner.email,
    contactPhone: "",
    ownerUserId: agencyOwner._id,
    status: "active"
  });

  agencyOwner.agencyId = agency._id;
  await agencyOwner.save();

  const ownerToken = signAccessToken(owner);
  const agencyToken = signAccessToken(agencyOwner);
  const app = createApp();

  const createContractResponse = await request(app)
    .post("/api/v1/contracts")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      reference: "CTR-DELETE-002",
      contractType: "agency",
      status: "draft",
      startDate: today.toISOString(),
      endDate: new Date(today.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      ownerUserId: String(owner._id),
      agencyId: String(agency._id),
      agency: {
        id: String(agency._id),
        name: agency.name,
        commission: 8,
        fees: 0
      },
      financial: {
        rentAmount: 250000,
        charges: 0,
        deposit: 0,
        currency: "XOF",
        paymentFrequency: "monthly",
        paymentMethod: "bank_transfer"
      }
    });

  assert.equal(createContractResponse.statusCode, 201);
  const contractId = createContractResponse.body.data.id;

  const property = await Property.create({
    title: "Bien a detacher",
    slug: `bien-a-detacher-${Date.now()}`,
    description: "Bien conserve apres suppression du contrat",
    type: "house",
    purpose: "rent",
    price: 100000,
    currency: "AR",
    area: 80,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    features: [],
    address: "Analamahitsy",
    location: { type: "Point", coordinates: [-4.0, 5.3] },
    coverImage: null,
    media: [],
    has3DView: false,
    threeDUrl: null,
    status: "draft",
    publicationStatus: "pending",
    ownerType: "agency",
    ownerUserId: owner._id,
    managementContractId: contractId,
    agentId: agencyOwner._id,
    agencyId: agency._id
  });

  const deleteResponse = await request(app)
    .delete(`/api/v1/contracts/${contractId}`)
    .set("Authorization", `Bearer ${agencyToken}`);

  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(await ManagementContract.countDocuments({ _id: contractId }), 0);

  const updatedProperty = await Property.findById(property._id).lean();

  assert.ok(updatedProperty);
  assert.equal(updatedProperty.managementContractId, null);
  assert.equal(updatedProperty.ownerType, "proprietaire");
  assert.equal(String(updatedProperty.ownerUserId), String(owner._id));
  assert.equal(updatedProperty.agencyId, null);
  assert.equal(String(updatedProperty.agentId), String(owner._id));
});
