import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../core/errors/app-error.js";
import { Booking } from "../../bookings/booking.model.js";
import { Property } from "../../properties/property.model.js";
import { User } from "../../users/user.model.js";
import { Agency } from "../agency.model.js";
import { AGENCY_ROLE_PERMISSIONS } from "../constants/agency-permissions.js";
import { AgencyCalendarEvent } from "../models/agency-calendar-event.model.js";
import { AgencyExpense } from "../models/agency-expense.model.js";
import { AgencyMember } from "../models/agency-member.model.js";
import { AgencyStatsSnapshot } from "../models/agency-stats-snapshot.model.js";
import { RoleTemplate } from "../models/role-template.model.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

export const ensureAgencyAccess = async ({ agencyId, userId, permission = null }) => {
  const agency = await Agency.findById(agencyId).lean();

  if (!agency) {
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  if (String(agency.ownerUserId) === String(userId)) {
    return {
      agency,
      member: {
        role: "owner",
        permissions: AGENCY_ROLE_PERMISSIONS.owner
      }
    };
  }

  const member = await AgencyMember.findOne({ agencyId, userId, status: "active" }).lean();

  if (!member) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  const effectivePermissions = member.permissions?.length
    ? member.permissions
    : AGENCY_ROLE_PERMISSIONS[member.role] || [];

  if (permission && !effectivePermissions.includes(permission)) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  return {
    agency,
    member: {
      ...member,
      permissions: effectivePermissions
    }
  };
};

export const listAgencyMembers = async ({ agencyId, userId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId, permission });
  return AgencyMember.find({ agencyId, status: { $ne: "removed" } }).sort({ createdAt: -1 }).lean();
};

export const createAgencyMember = async ({ agencyId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const targetUser = await User.findById(payload.userId).select("_id status").lean();

  if (!targetUser || targetUser.status !== "active") {
    throw new AppError("Target user not found", StatusCodes.NOT_FOUND);
  }

  const member = await AgencyMember.create({
    agencyId,
    userId: payload.userId,
    role: payload.role,
    permissions: payload.permissions?.length ? payload.permissions : AGENCY_ROLE_PERMISSIONS[payload.role] || [],
    invitedBy: actorUserId,
    jobTitle: payload.jobTitle || ""
  });

  return member.toObject();
};

export const updateAgencyMember = async ({ agencyId, memberId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const member = await AgencyMember.findOne({ _id: memberId, agencyId });

  if (!member) {
    throw new AppError("Agency member not found", StatusCodes.NOT_FOUND);
  }

  if (member.role === "owner") {
    throw new AppError("Owner membership cannot be modified here", StatusCodes.BAD_REQUEST);
  }

  if (payload.role) member.role = payload.role;
  if (payload.status) member.status = payload.status;
  if (payload.jobTitle !== undefined) member.jobTitle = payload.jobTitle;
  if (payload.permissions) member.permissions = payload.permissions;
  if (!payload.permissions && payload.role) member.permissions = AGENCY_ROLE_PERMISSIONS[payload.role] || [];

  await member.save();
  return member.toObject();
};

export const removeAgencyMember = async ({ agencyId, memberId, actorUserId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const member = await AgencyMember.findOne({ _id: memberId, agencyId });

  if (!member) {
    throw new AppError("Agency member not found", StatusCodes.NOT_FOUND);
  }

  member.status = "removed";
  await member.save();
  return { success: true };
};

export const listAgencyRoles = async ({ agencyId, userId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId, permission });
  return RoleTemplate.find({ agencyId }).sort({ createdAt: -1 }).lean();
};

export const createAgencyRole = async ({ agencyId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const role = await RoleTemplate.create({
    agencyId,
    name: payload.name,
    key: payload.key,
    permissions: payload.permissions,
    isSystem: payload.isSystem || false,
    createdBy: actorUserId
  });

  return role.toObject();
};

export const updateAgencyRole = async ({ agencyId, roleId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const role = await RoleTemplate.findOne({ _id: roleId, agencyId });

  if (!role) {
    throw new AppError("Role template not found", StatusCodes.NOT_FOUND);
  }

  if (payload.name !== undefined) role.name = payload.name;
  if (payload.permissions) role.permissions = payload.permissions;
  await role.save();
  return role.toObject();
};

export const deleteAgencyRole = async ({ agencyId, roleId, actorUserId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const role = await RoleTemplate.findOne({ _id: roleId, agencyId });

  if (!role) {
    throw new AppError("Role template not found", StatusCodes.NOT_FOUND);
  }

  if (role.isSystem) {
    throw new AppError("System role cannot be deleted", StatusCodes.BAD_REQUEST);
  }

  await role.deleteOne();
  return { success: true };
};

export const listAgencyCalendarEvents = async ({ agencyId, userId, permission, filters }) => {
  await ensureAgencyAccess({ agencyId, userId, permission });

  const query = { agencyId };
  if (filters.startAt || filters.endAt) {
    query.startAt = {};
    if (filters.startAt) query.startAt.$gte = new Date(filters.startAt);
    if (filters.endAt) query.startAt.$lte = new Date(filters.endAt);
  }

  const page = filters.page || 1;
  const limit = filters.limit || 30;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AgencyCalendarEvent.find(query).sort({ startAt: 1 }).skip(skip).limit(limit).lean(),
    AgencyCalendarEvent.countDocuments(query)
  ]);

  return {
    items,
    pagination: { page, limit, total, hasNextPage: skip + items.length < total }
  };
};

export const createAgencyCalendarEvent = async ({ agencyId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });

  if (new Date(payload.endAt) <= new Date(payload.startAt)) {
    throw new AppError("Event end date must be after start date", StatusCodes.BAD_REQUEST);
  }

  const event = await AgencyCalendarEvent.create({
    agencyId,
    agentId: payload.agentId || null,
    propertyId: payload.propertyId || null,
    bookingId: payload.bookingId || null,
    title: payload.title,
    description: payload.description || "",
    type: payload.type,
    startAt: new Date(payload.startAt),
    endAt: new Date(payload.endAt),
    status: payload.status || "scheduled",
    createdBy: actorUserId
  });

  return event.toObject();
};

export const updateAgencyCalendarEvent = async ({ agencyId, eventId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const event = await AgencyCalendarEvent.findOne({ _id: eventId, agencyId });

  if (!event) {
    throw new AppError("Calendar event not found", StatusCodes.NOT_FOUND);
  }

  Object.assign(event, {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.type !== undefined ? { type: payload.type } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.startAt !== undefined ? { startAt: new Date(payload.startAt) } : {}),
    ...(payload.endAt !== undefined ? { endAt: new Date(payload.endAt) } : {})
  });

  if (new Date(event.endAt) <= new Date(event.startAt)) {
    throw new AppError("Event end date must be after start date", StatusCodes.BAD_REQUEST);
  }

  await event.save();
  return event.toObject();
};

export const deleteAgencyCalendarEvent = async ({ agencyId, eventId, actorUserId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const event = await AgencyCalendarEvent.findOne({ _id: eventId, agencyId });

  if (!event) {
    throw new AppError("Calendar event not found", StatusCodes.NOT_FOUND);
  }

  await event.deleteOne();
  return { success: true };
};

export const listAgencyExpenses = async ({ agencyId, userId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId, permission });
  return AgencyExpense.find({ agencyId }).sort({ expenseDate: -1 }).lean();
};

export const createAgencyExpense = async ({ agencyId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const expense = await AgencyExpense.create({
    agencyId,
    label: payload.label,
    category: payload.category,
    amount: payload.amount,
    currency: payload.currency || "XOF",
    expenseDate: new Date(payload.expenseDate),
    notes: payload.notes || "",
    attachments: payload.attachments || [],
    createdBy: actorUserId
  });

  return expense.toObject();
};

export const updateAgencyExpense = async ({ agencyId, expenseId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const expense = await AgencyExpense.findOne({ _id: expenseId, agencyId });

  if (!expense) {
    throw new AppError("Expense not found", StatusCodes.NOT_FOUND);
  }

  if (expense.status === "approved") {
    throw new AppError("Approved expense cannot be edited", StatusCodes.BAD_REQUEST);
  }

  Object.assign(expense, {
    ...(payload.label !== undefined ? { label: payload.label } : {}),
    ...(payload.category !== undefined ? { category: payload.category } : {}),
    ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
    ...(payload.currency !== undefined ? { currency: payload.currency } : {}),
    ...(payload.expenseDate !== undefined ? { expenseDate: new Date(payload.expenseDate) } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.attachments !== undefined ? { attachments: payload.attachments } : {})
  });

  await expense.save();
  return expense.toObject();
};

export const approveAgencyExpense = async ({ agencyId, expenseId, actorUserId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const expense = await AgencyExpense.findOne({ _id: expenseId, agencyId });

  if (!expense) {
    throw new AppError("Expense not found", StatusCodes.NOT_FOUND);
  }

  expense.status = "approved";
  expense.approvedBy = actorUserId;
  await expense.save();
  return expense.toObject();
};

export const deleteAgencyExpense = async ({ agencyId, expenseId, actorUserId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const expense = await AgencyExpense.findOne({ _id: expenseId, agencyId });

  if (!expense) {
    throw new AppError("Expense not found", StatusCodes.NOT_FOUND);
  }

  if (expense.status === "approved") {
    throw new AppError("Approved expense cannot be deleted", StatusCodes.BAD_REQUEST);
  }

  await expense.deleteOne();
  return { success: true };
};

export const getAgencyStatsOverview = async ({ agencyId, userId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId, permission });

  const agencyObjectId = toObjectId(agencyId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const [
    latestSnapshot,
    activeAgents,
    totalMembers,
    activeProperties,
    totalBookings,
    completedBookings,
    upcomingEvents,
    currentMonthEvents,
    currentMonthExpenseTotals,
    expenseBreakdown,
    topAgents
  ] = await Promise.all([
    AgencyStatsSnapshot.findOne({ agencyId }).sort({ periodStart: -1 }).lean(),
    AgencyMember.countDocuments({ agencyId, status: "active" }),
    AgencyMember.countDocuments({ agencyId, status: { $ne: "removed" } }),
    Property.countDocuments({ agencyId, status: { $in: ["published", "reserved"] } }),
    Booking.countDocuments({ agencyId }),
    Booking.countDocuments({ agencyId, status: "completed" }),
    AgencyCalendarEvent.countDocuments({ agencyId, startAt: { $gte: now } }),
    AgencyCalendarEvent.countDocuments({ agencyId, startAt: { $gte: monthStart, $lt: nextMonthStart } }),
    AgencyExpense.aggregate([
      { $match: { agencyId: agencyObjectId, expenseDate: { $gte: monthStart, $lt: nextMonthStart } } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" }
        }
      }
    ]),
    AgencyExpense.aggregate([
      { $match: { agencyId: agencyObjectId, expenseDate: { $gte: monthStart, $lt: nextMonthStart } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]),
    AgencyMember.aggregate([
      { $match: { agencyId: agencyObjectId, status: "active", role: { $in: ["agent", "supervisor", "manager"] } } },
      {
        $lookup: {
          from: "bookings",
          localField: "userId",
          foreignField: "agentId",
          as: "bookings"
        }
      },
      {
        $addFields: {
          bookingsCount: { $size: "$bookings" },
          completedBookings: {
            $size: {
              $filter: {
                input: "$bookings",
                as: "booking",
                cond: { $eq: ["$$booking.status", "completed"] }
              }
            }
          }
        }
      },
      {
        $project: {
          userId: 1,
          role: 1,
          jobTitle: 1,
          bookingsCount: 1,
          completedBookings: 1
        }
      },
      { $sort: { completedBookings: -1, bookingsCount: -1 } },
      { $limit: 5 }
    ])
  ]);

  const pendingExpenses = currentMonthExpenseTotals.find((item) => item._id === "pending")?.total || 0;
  const approvedExpensesTotal = currentMonthExpenseTotals.find((item) => item._id === "approved")?.total || 0;
  const rejectedExpensesTotal = currentMonthExpenseTotals.find((item) => item._id === "rejected")?.total || 0;
  const currentMonthExpensesTotal = currentMonthExpenseTotals.reduce((sum, item) => sum + item.total, 0);

  return {
    agencyId,
    activeAgents,
    totalMembers,
    activeProperties,
    totalBookings,
    completedBookings,
    upcomingEvents,
    currentMonthEvents,
    pendingExpenses,
    approvedExpensesTotal,
    rejectedExpensesTotal,
    currentMonthExpensesTotal,
    expenseBreakdown: expenseBreakdown.map((item) => ({
      category: item._id,
      total: item.total,
      count: item.count
    })),
    topAgents,
    weeklyWindow: {
      from: now.toISOString(),
      to: weekEnd.toISOString()
    },
    latestSnapshot: latestSnapshot || null
  };
};
