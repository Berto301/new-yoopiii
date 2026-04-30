import fs from "node:fs/promises";
import mongoose from "mongoose";
import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../../core/errors/app-error.js";
import { Booking } from "../../bookings/booking.model.js";
import { Conversation } from "../../conversations/conversation.model.js";
import { Message } from "../../conversations/message.model.js";
import { DataFile } from "../../files/data-file.model.js";
import { Notification } from "../../notifications/notification.model.js";
import { PropertyFavorite } from "../../properties/models/property-favorite.model.js";
import { PropertyView } from "../../properties/models/property-view.model.js";
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

const resolveRolePermissions = async (roleTemplateId, fallbackPermissions = []) => {
  if (!roleTemplateId) {
    return fallbackPermissions;
  }

  const roleTemplate = await RoleTemplate.findById(roleTemplateId).lean();
  return roleTemplate?.permissions?.length ? roleTemplate.permissions : fallbackPermissions;
};

const deleteFileIfExists = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  try {
    await fs.unlink(storagePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
};

const syncAgencyMemberUserAccess = async ({ userId, agencyId = null, roleTemplateId = null, isActiveMember = true }) => {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        role: isActiveMember ? "agency_agent" : "user",
        agencyId: isActiveMember ? agencyId : null,
        permissionId: isActiveMember ? roleTemplateId || null : null
      }
    }
  );
};

export const ensureAgencyAccess = async ({ agencyId, userId, permission = null }) => {
  const agency = await Agency.findById(agencyId).lean();

  if (!agency) {
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  if (String(agency.ownerUserId) === String(userId)) {
    const ownerRole = await RoleTemplate.findOne({ agencyId, key: "owner" }).lean();
    const ownerPermissions = ownerRole?.permissions || AGENCY_ROLE_PERMISSIONS.owner;

    return {
      agency,
      member: {
        role: "owner",
        permissionId: ownerRole?._id ? String(ownerRole._id) : null,
        permissions: ownerPermissions
      }
    };
  }

  const member = await AgencyMember.findOne({ agencyId, userId, status: "active" }).lean();

  if (!member) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  const effectivePermissions = await resolveRolePermissions(
    member.permissionId,
    member.permissions?.length ? member.permissions : AGENCY_ROLE_PERMISSIONS[member.role] || []
  );

  if (permission && !effectivePermissions.includes(permission)) {
    throw new AppError("Forbidden", StatusCodes.FORBIDDEN);
  }

  return {
    agency,
    member: {
      ...member,
      permissionId: member.permissionId ? String(member.permissionId) : null,
      permissions: effectivePermissions
    }
  };
};

export const listAgencyMembers = async ({ agencyId, userId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId, permission });
  const members = await AgencyMember.find({ agencyId, status: { $ne: "removed" } })
    .populate("userId", "firstName lastName email phone avatar status")
    .sort({ createdAt: -1 })
    .lean();

  return members.map((member) => {
    const linkedUser = member.userId && typeof member.userId === "object" ? member.userId : null;

    return {
      ...member,
      userId: linkedUser?._id || member.userId,
      firstName: linkedUser?.firstName || "",
      lastName: linkedUser?.lastName || "",
      email: linkedUser?.email || "",
      phone: linkedUser?.phone || "",
      avatar: linkedUser?.avatar || null,
      userStatus: linkedUser?.status || null
    };
  });
};

export const createAgencyMember = async ({ agencyId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  let targetUser = null;

  if (payload.userId) {
    targetUser = await User.findById(payload.userId).select("_id status").lean();
  } else if (payload.user) {
    const existingUser = await User.findOne({ email: payload.user.email }).lean();

    if (existingUser) {
      throw new AppError("Email already in use", StatusCodes.CONFLICT);
    }

    const generatedPasswordHash = await User.hashPassword(crypto.randomUUID());

    targetUser = await User.create({
      firstName: payload.user.firstName,
      lastName: payload.user.lastName,
      email: payload.user.email,
      phone: payload.user.phone || "",
      role: "agency_agent",
      agencyId,
      permissionId: payload.permissionId || null,
      passwordHash: generatedPasswordHash,
      status: "active"
    });
  }

  if (!targetUser || targetUser.status !== "active") {
    throw new AppError("Target user not found", StatusCodes.NOT_FOUND);
  }

  const assignedRoleId = payload.permissionId || null;
  const resolvedPermissions = payload.permissions?.length
    ? payload.permissions
    : await resolveRolePermissions(assignedRoleId, AGENCY_ROLE_PERMISSIONS[payload.role] || []);

  const member = await AgencyMember.create({
    agencyId,
    userId: targetUser._id,
    role: payload.role,
    permissionId: assignedRoleId,
    permissions: resolvedPermissions,
    status: payload.status || "invited",
    invitedBy: actorUserId,
    jobTitle: payload.jobTitle || ""
  });

  await syncAgencyMemberUserAccess({
    userId: targetUser._id,
    agencyId,
    roleTemplateId: assignedRoleId,
    isActiveMember: true
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

  if (payload.user) {
    const existingUser = await User.findById(member.userId);

    if (!existingUser) {
      throw new AppError("Target user not found", StatusCodes.NOT_FOUND);
    }

    if (payload.user.email && payload.user.email !== existingUser.email) {
      const duplicateUser = await User.findOne({ email: payload.user.email, _id: { $ne: existingUser._id } }).lean();

      if (duplicateUser) {
        throw new AppError("Email already in use", StatusCodes.CONFLICT);
      }
    }

    if (payload.user.firstName !== undefined) existingUser.firstName = payload.user.firstName;
    if (payload.user.lastName !== undefined) existingUser.lastName = payload.user.lastName;
    if (payload.user.email !== undefined) existingUser.email = payload.user.email;
    if (payload.user.phone !== undefined) existingUser.phone = payload.user.phone || "";

    await existingUser.save();
  }

  if (payload.role) member.role = payload.role;
  if (payload.status) member.status = payload.status;
  if (payload.jobTitle !== undefined) member.jobTitle = payload.jobTitle;
  if (payload.permissionId !== undefined) member.permissionId = payload.permissionId;

  if (payload.permissions || payload.permissionId || payload.role) {
    member.permissions = payload.permissions?.length
      ? payload.permissions
      : await resolveRolePermissions(member.permissionId, AGENCY_ROLE_PERMISSIONS[member.role] || []);
  }

  await member.save();

  await syncAgencyMemberUserAccess({
    userId: member.userId,
    agencyId,
    roleTemplateId: member.permissionId,
    isActiveMember: member.status !== "removed"
  });

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
  await syncAgencyMemberUserAccess({
    userId: member.userId,
    roleTemplateId: null,
    isActiveMember: false
  });
  return { success: true };
};

export const listAgencyRoles = async ({ agencyId, userId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId, permission });
  return RoleTemplate.find({ agencyId }).sort({ createdAt: -1 }).lean();
};

const buildRoleTemplateKey = async ({ agencyId, baseKey }) => {
  const normalizedBaseKey =
    String(baseKey || "role")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `role-${Date.now()}`;

  let key = normalizedBaseKey;
  let counter = 1;

  while (await RoleTemplate.findOne({ agencyId, key }).lean()) {
    counter += 1;
    key = `${normalizedBaseKey}-${counter}`;
  }

  return key;
};

export const createAgencyRole = async ({ agencyId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const key = await buildRoleTemplateKey({ agencyId, baseKey: payload.key || payload.name });
  const role = await RoleTemplate.create({
    agencyId,
    name: payload.name,
    key,
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

  if (role.isSystem || role.key === "owner") {
    throw new AppError("Owner role cannot be modified", StatusCodes.BAD_REQUEST);
  }

  if (payload.name !== undefined) role.name = payload.name;
  if (payload.permissions) role.permissions = payload.permissions;
  await role.save();
  return role.toObject();
};

export const duplicateAgencyRole = async ({ agencyId, roleId, actorUserId, payload, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const sourceRole = await RoleTemplate.findOne({ _id: roleId, agencyId }).lean();

  if (!sourceRole) {
    throw new AppError("Role template not found", StatusCodes.NOT_FOUND);
  }

  if (sourceRole.isSystem || sourceRole.key === "owner") {
    throw new AppError("Owner role cannot be duplicated", StatusCodes.BAD_REQUEST);
  }

  const duplicatedRole = await RoleTemplate.create({
    agencyId,
    name: payload.name || `${sourceRole.name} copie`,
    key: await buildRoleTemplateKey({ agencyId, baseKey: payload.key || `${sourceRole.key}-copy` }),
    permissions: sourceRole.permissions || [],
    isSystem: false,
    createdBy: actorUserId
  });

  return duplicatedRole.toObject();
};

export const deleteAgencyRole = async ({ agencyId, roleId, actorUserId, permission }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId, permission });
  const role = await RoleTemplate.findOne({ _id: roleId, agencyId });

  if (!role) {
    throw new AppError("Role template not found", StatusCodes.NOT_FOUND);
  }

  if (role.isSystem || role.key === "owner") {
    throw new AppError("Owner role cannot be deleted", StatusCodes.BAD_REQUEST);
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
    currency: payload.currency || "USD",
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
  const { agency } = await ensureAgencyAccess({ agencyId, userId, permission });

  const agencyObjectId = toObjectId(agencyId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const [latestSnapshot, activeAgents, totalMembers, activeProperties, totalBookings, completedBookings, upcomingEvents, currentMonthEvents, currentMonthExpenseTotals, expenseBreakdown, topAgents] = await Promise.all([
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
      { $group: { _id: "$status", total: { $sum: "$amount" } } }
    ]),
    AgencyExpense.aggregate([
      { $match: { agencyId: agencyObjectId, expenseDate: { $gte: monthStart, $lt: nextMonthStart } } },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]),
    AgencyMember.aggregate([
      { $match: { agencyId: agencyObjectId, status: "active", role: { $in: ["agent", "supervisor", "manager"] } } },
      { $lookup: { from: "bookings", localField: "userId", foreignField: "agentId", as: "bookings" } },
      {
        $addFields: {
          bookingsCount: { $size: "$bookings" },
          completedBookings: {
            $size: {
              $filter: { input: "$bookings", as: "booking", cond: { $eq: ["$$booking.status", "completed"] } }
            }
          }
        }
      },
      { $project: { userId: 1, role: 1, jobTitle: 1, bookingsCount: 1, completedBookings: 1 } },
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
    score: agency.score || 0,
    scoreDetails: agency.scoreDetails || null,
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
    expenseBreakdown: expenseBreakdown.map((item) => ({ category: item._id, total: item.total, count: item.count })),
    topAgents,
    weeklyWindow: { from: now.toISOString(), to: weekEnd.toISOString() },
    latestSnapshot: latestSnapshot || null
  };
};

export const getAgencyDetail = async ({ agencyId, userId }) => {
  await ensureAgencyAccess({ agencyId, userId });

  const agency = await Agency.findById(agencyId).lean();

  if (!agency) {
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  return agency;
};

export const updateAgencyProfile = async ({ agencyId, actorUserId, payload }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId });
  const agency = await Agency.findById(agencyId);

  if (!agency) {
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  if (payload.name !== undefined) agency.name = payload.name;
  if (payload.logo !== undefined) agency.logo = payload.logo || null;
  if (payload.coverImage !== undefined) agency.coverImage = payload.coverImage || null;
  if (payload.description !== undefined) agency.description = payload.description || "";
  if (payload.contactEmail !== undefined) agency.contactEmail = payload.contactEmail;
  if (payload.contactPhone !== undefined) agency.contactPhone = payload.contactPhone || "";
  if (payload.address !== undefined) agency.address = payload.address || "";

  await agency.save();
  return agency.toObject();
};

export const uploadAgencyAsset = async ({ agencyId, actorUserId, assetKind, file }) => {
  await ensureAgencyAccess({ agencyId, userId: actorUserId });

  if (!file) {
    throw new AppError("Agency image file is required", StatusCodes.BAD_REQUEST);
  }

  const agency = await Agency.findById(agencyId);

  if (!agency) {
    await deleteFileIfExists(file.path);
    throw new AppError("Agency not found", StatusCodes.NOT_FOUND);
  }

  const normalizedAssetKind = assetKind === "cover" ? "cover" : "logo";
  const dataFileKind = normalizedAssetKind === "cover" ? "agency-cover" : "agency-logo";
  const publicPath = `/uploads/agencies/${file.filename}`;
  const previousDataFile = await DataFile.findOne({ ownerAgencyId: agencyId, kind: dataFileKind });

  if (previousDataFile?.storagePath && previousDataFile.storagePath !== file.path) {
    await deleteFileIfExists(previousDataFile.storagePath);
  }

  await DataFile.findOneAndUpdate(
    { ownerAgencyId: agencyId, kind: dataFileKind },
    {
      ownerAgencyId: agencyId,
      ownerUserId: actorUserId,
      kind: dataFileKind,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path,
      publicPath
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  if (normalizedAssetKind === "cover") {
    agency.coverImage = publicPath;
  } else {
    agency.logo = publicPath;
  }

  await agency.save();

  return agency.toObject();
};

export const deleteAgencyCascade = async ({ agencyId, actorUserId }) => {
  const { agency } = await ensureAgencyAccess({ agencyId, userId: actorUserId });

  if (String(agency.ownerUserId) !== String(actorUserId)) {
    throw new AppError("Only the agency owner can delete the agency", StatusCodes.FORBIDDEN);
  }

  const memberUserIds = await AgencyMember.find({ agencyId }).distinct("userId");
  const userIds = [...new Set([String(agency.ownerUserId), ...memberUserIds.map((item) => String(item))])].map((item) => toObjectId(item));
  const propertyIds = await Property.find({ agencyId }).distinct("_id");
  const conversationIds = await Conversation.find({
    $or: [{ participantIds: { $in: userIds } }, ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : [])]
  }).distinct("_id");

  const agencyFiles = await DataFile.find({ ownerAgencyId: agencyId }).lean();
  await Promise.all(agencyFiles.map((fileItem) => deleteFileIfExists(fileItem.storagePath)));

  await Promise.all([
    AgencyCalendarEvent.deleteMany({ agencyId }),
    AgencyExpense.deleteMany({ agencyId }),
    AgencyMember.deleteMany({ agencyId }),
    AgencyStatsSnapshot.deleteMany({ agencyId }),
    RoleTemplate.deleteMany({ agencyId }),
    DataFile.deleteMany({ ownerAgencyId: agencyId }),
    Notification.deleteMany({ userId: { $in: userIds } }),
    Booking.deleteMany({
      $or: [{ agencyId }, { agentId: { $in: userIds } }, ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : [])]
    }),
    PropertyFavorite.deleteMany({
      $or: [{ userId: { $in: userIds } }, ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : [])]
    }),
    PropertyView.deleteMany({
      $or: [{ userId: { $in: userIds } }, ...(propertyIds.length ? [{ propertyId: { $in: propertyIds } }] : [])]
    }),
    Message.deleteMany({
      $or: [
        { senderId: { $in: userIds } },
        { receiverId: { $in: userIds } },
        ...(conversationIds.length ? [{ conversationId: { $in: conversationIds } }] : [])
      ]
    }),
    ...(conversationIds.length ? [Conversation.deleteMany({ _id: { $in: conversationIds } })] : []),
    Property.deleteMany({ $or: [{ agencyId }, { agentId: { $in: userIds } }] })
  ]);

  await User.deleteMany({ _id: { $in: userIds } });
  await Agency.deleteOne({ _id: agencyId });

  return {
    success: true,
    deletedAgencyId: agencyId,
    deletedUsersCount: userIds.length,
    deletedPropertiesCount: propertyIds.length,
    deletedConversationsCount: conversationIds.length
  };
};
