import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { signAccessToken } from "../core/utils/jwt.js";
import { Agency } from "../modules/agencies/agency.model.js";
import { AgencyMember } from "../modules/agencies/models/agency-member.model.js";
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

const createUser = (payload) => User.create({
  firstName: payload.firstName || "Test",
  lastName: payload.lastName || "User",
  email: payload.email,
  passwordHash: "hashed-password",
  role: payload.role || "user",
  status: "active",
  agencyId: payload.agencyId || null
});

test("scoring APIs recalculate property, agent and agency scores", async () => {
  const app = createApp();
  const owner = await createUser({ firstName: "Agency", lastName: "Owner", email: "score-owner@yopii.test", role: "agency" });
  const agent = await createUser({ firstName: "Smart", lastName: "Agent", email: "score-agent@yopii.test", role: "agency_agent" });
  const client = await createUser({ firstName: "Client", lastName: "Rater", email: "score-client@yopii.test", role: "user" });

  const agency = await Agency.create({
    name: "Score Agency",
    slug: "score-agency",
    contactEmail: "score-agency@yopii.test",
    ownerUserId: owner._id,
    status: "active"
  });

  owner.agencyId = agency._id;
  agent.agencyId = agency._id;
  await Promise.all([owner.save(), agent.save()]);

  await AgencyMember.create({
    agencyId: agency._id,
    userId: agent._id,
    role: "agent",
    permissions: [],
    status: "active"
  });

  const property = await Property.create({
    title: "Villa score premium",
    slug: "villa-score-premium",
    description: "Grande villa bien presentee avec visite virtuelle et historique commercial.",
    type: "house",
    purpose: "sale",
    price: 240000000,
    currency: "AR",
    area: 220,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 3,
    features: ["transport", "ecole", "commerce"],
    address: "Ivandry, Antananarivo",
    location: { type: "Point", coordinates: [47.53, -18.88] },
    coverImage: "/uploads/properties/cover-score.jpg",
    media: [
      { type: "image", url: "/uploads/properties/score-1.jpg", order: 0 },
      { type: "image", url: "/uploads/properties/score-2.jpg", order: 1 },
      { type: "image", url: "/uploads/properties/score-3.jpg", order: 2 },
      { type: "image", url: "/uploads/properties/score-4.jpg", order: 3 }
    ],
    threeDUrl: "https://youtu.be/demo-score-tour",
    ownerType: "agency",
    agentId: agent._id,
    agencyId: agency._id,
    status: "published",
    publicationStatus: "approved",
    viewCount: 24,
    favoriteCount: 5
  });

  const agentToken = signAccessToken(agent);
  const clientToken = signAccessToken(client);
  const ownerToken = signAccessToken(owner);

  const propertyScoreResponse = await request(app)
    .post(`/api/v1/properties/${property._id}/recalculate-score`)
    .set("Authorization", `Bearer ${agentToken}`);

  assert.equal(propertyScoreResponse.statusCode, 200);
  assert.equal(propertyScoreResponse.body.success, true);
  assert.ok(propertyScoreResponse.body.data.score > 0);
  assert.ok(propertyScoreResponse.body.data.scoreDetails.photoScore > 0);

  const agentRatingResponse = await request(app)
    .post(`/api/v1/users/agents/${agent._id}/ratings`)
    .set("Authorization", `Bearer ${clientToken}`)
    .send({ score: 94, description: "Excellent suivi et reponse rapide." });

  assert.equal(agentRatingResponse.statusCode, 201);
  assert.equal(agentRatingResponse.body.success, true);
  assert.ok(agentRatingResponse.body.data.agentScore.score > 0);
  assert.ok(agentRatingResponse.body.data.agentScore.scoreDetails.ratingScore > 0);

  const agencyScoreResponse = await request(app)
    .post(`/api/v1/agencies/${agency._id}/recalculate-score`)
    .set("Authorization", `Bearer ${ownerToken}`);

  assert.equal(agencyScoreResponse.statusCode, 200);
  assert.equal(agencyScoreResponse.body.success, true);
  assert.ok(agencyScoreResponse.body.data.score > 0);
  assert.ok(agencyScoreResponse.body.data.scoreDetails.agentsScore > 0);

  const topAgentsResponse = await request(app)
    .get("/api/v1/users/agents/top?limit=5")
    .set("Authorization", `Bearer ${clientToken}`);

  assert.equal(topAgentsResponse.statusCode, 200);
  assert.equal(topAgentsResponse.body.data.items[0].userId, String(agent._id));
  assert.ok(topAgentsResponse.body.data.items[0].score > 0);
});
