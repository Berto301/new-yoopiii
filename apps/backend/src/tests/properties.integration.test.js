import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
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
  await Property.syncIndexes();
});

after(async () => {
  await disconnectTestDatabase();
});

const createAgent = () =>
  User.create({
    firstName: "Geo",
    lastName: "Agent",
    email: `geo-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role: "independent_agent",
    status: "active"
  });

const createUser = (role = "user") =>
  User.create({
    firstName: "Viewer",
    lastName: "User",
    email: `viewer-${Date.now()}-${Math.random()}@yopii.test`,
    passwordHash: "hashed-password",
    role,
    status: "active"
  });

const createProperty = ({ agentId, title, slug, coordinates, price = 100000000 }) =>
  Property.create({
    title,
    slug,
    description: `${title} description`,
    type: "house",
    purpose: "sale",
    price,
    area: 200,
    bedrooms: 3,
    bathrooms: 2,
    address: title,
    location: { type: "Point", coordinates },
    ownerType: "independent_agent",
    agentId,
    status: "published",
    publicationStatus: "approved"
  });

test("GET /api/v1/properties/search/nearby returns properties sorted by distance", async () => {
  const agent = await createAgent();

  await createProperty({
    agentId: agent._id,
    title: "Villa Centre",
    slug: "villa-centre",
    coordinates: [-4.01, 5.35],
    price: 150000000
  });

  await createProperty({
    agentId: agent._id,
    title: "Villa Bingerville",
    slug: "villa-bingerville",
    coordinates: [-3.97, 5.36],
    price: 180000000
  });

  const app = createApp();
  const response = await request(app).get(
    "/api/v1/properties/search/nearby?lat=5.35&lng=-4.01&radiusKm=10"
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.items.length, 2);
  assert.equal(response.body.data.items[0].slug, "villa-centre");
  assert.equal(response.body.data.items[0].mapMarker.lat, 5.35);
  assert.equal(response.body.data.items[0].mapMarker.lng, -4.01);
  assert.equal(response.body.data.map.radiusKm, 10);
  assert.equal(response.body.data.pagination.total, 2);
});

test("GET /api/v1/properties/search/bounds filters properties inside viewport", async () => {
  const agent = await createAgent();

  await createProperty({
    agentId: agent._id,
    title: "Villa Cocody",
    slug: "villa-cocody",
    coordinates: [-4.0, 5.36]
  });

  await createProperty({
    agentId: agent._id,
    title: "Villa Yamoussoukro",
    slug: "villa-yamoussoukro",
    coordinates: [-5.28, 6.82]
  });

  const app = createApp();
  const response = await request(app).get(
    "/api/v1/properties/search/bounds?northEastLat=5.40&northEastLng=-3.95&southWestLat=5.30&southWestLng=-4.05&lat=5.35&lng=-4.00"
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.items.length, 1);
  assert.equal(response.body.data.items[0].slug, "villa-cocody");
  assert.equal(response.body.data.map.bounds.northEast.lat, 5.4);
  assert.equal(response.body.data.map.center.lat, 5.35);
  assert.equal(response.body.data.pagination.total, 1);
});

test("GET /api/v1/properties/publications/feed exposes maintenance tag for properties in progress", async () => {
  const owner = await createUser("proprietaire");
  const viewer = await createUser("user");

  const property = await Property.create({
    title: "Villa maintenance",
    slug: `villa-maintenance-${Date.now()}`,
    description: "Publication avec ticket en cours",
    type: "house",
    purpose: "rent",
    price: 950000,
    currency: "Ar",
    area: 120,
    rooms: 4,
    bedrooms: 3,
    bathrooms: 2,
    features: [],
    address: "Analamahitsy",
    location: { type: "Point", coordinates: [47.54, -18.87] },
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "published",
    publicationStatus: "approved"
  });

  await OwnerMaintenanceTicket.create({
    ownerId: owner._id,
    managedPropertyId: property._id,
    propertyLabel: property.title,
    title: "Panne electrique",
    priority: "high",
    assignee: "Electro Pro",
    status: "in_progress",
    lastUpdateAt: new Date("2026-04-19T00:00:00.000Z"),
    lastUpdateLabel: "19 avril 2026"
  });

  const app = createApp();
  const response = await request(app)
    .get("/api/v1/properties/publications/feed?page=1&limit=10")
    .set("Authorization", `Bearer ${signAccessToken(viewer)}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.items.length, 1);
  assert.equal(response.body.data.items[0].isUnderMaintenance, true);
});

test("GET /api/v1/properties/public/:identifier returns the real published property detail by slug", async () => {
  const owner = await createUser("proprietaire");

  const property = await Property.create({
    title: "Villa detail",
    slug: `villa-detail-${Date.now()}`,
    description: "Detail public reel avec galerie images",
    type: "house",
    purpose: "sale",
    price: 145000000,
    currency: "AR",
    area: 210,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 3,
    features: ["Piscine", "Garage"],
    address: "Antsirabe centre",
    location: { type: "Point", coordinates: [47.03961, -19.872006] },
    coverImage: "/uploads/properties/cover-villa-detail.jpg",
    media: [
      {
        type: "image",
        url: "/uploads/properties/gallery-villa-detail-1.jpg",
        thumbnailUrl: "/uploads/properties/gallery-villa-detail-1-thumb.jpg",
        order: 0
      }
    ],
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "published",
    publicationStatus: "approved"
  });

  const app = createApp();
  const response = await request(app).get(`/api/v1/properties/public/${property.slug}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, String(property._id));
  assert.equal(response.body.data.slug, property.slug);
  assert.equal(response.body.data.coverImage, "/uploads/properties/cover-villa-detail.jpg");
  assert.equal(response.body.data.media.length, 1);
  assert.equal(response.body.data.media[0].url, "/uploads/properties/gallery-villa-detail-1.jpg");
  assert.equal(response.body.data.mapMarker.lat, -19.872006);
  assert.equal(response.body.data.mapMarker.lng, 47.03961);
});

test("GET /api/v1/properties/management/view/:identifier returns a managed draft property for its owner", async () => {
  const owner = await createUser("proprietaire");

  const property = await Property.create({
    title: "Villa 3D privee",
    slug: `villa-3d-privee-${Date.now()}`,
    description: "Bien non publie mais visible dans l'espace de gestion.",
    type: "house",
    purpose: "sale",
    price: 175000000,
    currency: "AR",
    area: 240,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 3,
    features: ["Piscine"],
    address: "Anosy Avaratra",
    location: { type: "Point", coordinates: [47.531, -18.879] },
    coverImage: "/uploads/properties/cover-3d-private.jpg",
    media: [
      {
        type: "image",
        url: "/uploads/properties/private-3d-1.jpg",
        thumbnailUrl: "/uploads/properties/private-3d-1.jpg",
        order: 0
      }
    ],
    is3DEnabled: true,
    has3DView: true,
    threeDUrl: `http://localhost:5173/properties/${`villa-3d-privee-${Date.now()}`}/3d-tour`,
    threeDStatus: "generated",
    threeDGeneratedAt: new Date(),
    ownerType: "proprietaire",
    ownerUserId: owner._id,
    agentId: owner._id,
    status: "draft",
    publicationStatus: "pending"
  });

  const app = createApp();
  const response = await request(app)
    .get(`/api/v1/properties/management/view/${property.slug}`)
    .set("Authorization", `Bearer ${signAccessToken(owner)}`);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.slug, property.slug);
  assert.equal(response.body.data.status, "draft");
  assert.equal(response.body.data.publicationStatus, "pending");
  assert.equal(response.body.data.is3DEnabled, true);
});
