import mongoose from "mongoose";
import { connectDatabase } from "../core/database/mongoose.js";
import { Agency } from "../modules/agencies/agency.model.js";
import { AgencyCalendarEvent } from "../modules/agencies/models/agency-calendar-event.model.js";
import { AgencyExpense } from "../modules/agencies/models/agency-expense.model.js";
import { AgencyMember } from "../modules/agencies/models/agency-member.model.js";
import { AgencyStatsSnapshot } from "../modules/agencies/models/agency-stats-snapshot.model.js";
import { User } from "../modules/users/user.model.js";

const run = async () => {
  await connectDatabase();

  const ownerEmail = "agency-owner-demo@yopii.app";
  let owner = await User.findOne({ email: ownerEmail });

  if (!owner) {
    owner = await User.create({
      firstName: "Aminata",
      lastName: "Kone",
      email: ownerEmail,
      phone: "+2250700000000",
      role: "agency",
      passwordHash: await User.hashPassword("Password123!"),
      status: "active"
    });
  }

  let agency = await Agency.findOne({ slug: "yopii-demo-agency" });

  if (!agency) {
    agency = await Agency.create({
      name: "Yopii Demo Agency",
      slug: "yopii-demo-agency",
      description: "Agence de demonstration pour les developpements locaux.",
      contactEmail: "agency-demo@yopii.app",
      contactPhone: "+2250700000001",
      address: "Abidjan, Cocody",
      ownerUserId: owner._id,
      status: "active",
      subscriptionPlan: "growth"
    });
  }

  const agentEmail = "agency-agent-demo@yopii.app";
  let agent = await User.findOne({ email: agentEmail });

  if (!agent) {
    agent = await User.create({
      firstName: "Moussa",
      lastName: "Traore",
      email: agentEmail,
      phone: "+2250700000002",
      role: "agency_agent",
      passwordHash: await User.hashPassword("Password123!"),
      status: "active",
      agencyId: agency._id
    });
  }

  await AgencyMember.updateOne(
    { agencyId: agency._id, userId: agent._id },
    {
      $set: {
        role: "agent",
        status: "active",
        jobTitle: "Conseiller immobilier"
      }
    },
    { upsert: true }
  );

  await AgencyCalendarEvent.updateOne(
    { agencyId: agency._id, title: "Visite demo" },
    {
      $set: {
        agentId: agent._id,
        type: "visit",
        startAt: new Date(Date.now() + 86_400_000),
        endAt: new Date(Date.now() + 90_000_000),
        createdBy: owner._id,
        status: "scheduled"
      }
    },
    { upsert: true }
  );

  await AgencyExpense.updateOne(
    { agencyId: agency._id, label: "Budget marketing demo" },
    {
      $set: {
        category: "marketing",
        amount: 500000,
        expenseDate: new Date(),
        status: "approved",
        createdBy: owner._id,
        approvedBy: owner._id
      }
    },
    { upsert: true }
  );

  await AgencyStatsSnapshot.updateOne(
    { agencyId: agency._id, periodType: "monthly" },
    {
      $set: {
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        periodEnd: new Date(),
        activeAgents: 1,
        propertiesPublished: 0,
        bookingsCount: 0,
        completedVisits: 0,
        expensesTotal: 500000,
        revenueEstimated: 0,
        averageAgentRating: 0,
        teamScore: 72
      }
    },
    { upsert: true }
  );

  console.log("Agency demo seed completed", {
    ownerEmail,
    agentEmail,
    agencyId: String(agency._id)
  });

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Agency demo seed failed", error);
  process.exit(1);
});
