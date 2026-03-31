import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
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
