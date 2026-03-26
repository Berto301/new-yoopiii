import { StatusCodes } from "http-status-codes";
import { Agency } from "./agency.model.js";
import { AGENCY_PERMISSIONS } from "./constants/agency-permissions.js";
import {
  approveAgencyExpense,
  createAgencyCalendarEvent,
  createAgencyExpense,
  createAgencyMember,
  createAgencyRole,
  deleteAgencyCalendarEvent,
  deleteAgencyExpense,
  deleteAgencyRole,
  getAgencyStatsOverview,
  listAgencyCalendarEvents,
  listAgencyExpenses,
  listAgencyMembers,
  listAgencyRoles,
  removeAgencyMember,
  updateAgencyCalendarEvent,
  updateAgencyExpense,
  updateAgencyMember,
  updateAgencyRole
} from "./services/agency-management.service.js";

export const getAgencies = async (_req, res) => {
  const agencies = await Agency.find().limit(50).lean();

  res.status(StatusCodes.OK).json({
    success: true,
    data: agencies
  });
};

export const getAgencyMembers = async (req, res) => {
  const data = await listAgencyMembers({
    agencyId: req.validated.params.agencyId,
    userId: req.user.id,
    permission: AGENCY_PERMISSIONS.MEMBERS_READ
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postAgencyMember = async (req, res) => {
  const data = await createAgencyMember({
    agencyId: req.validated.params.agencyId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.MEMBERS_INVITE
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const patchAgencyMember = async (req, res) => {
  const data = await updateAgencyMember({
    agencyId: req.validated.params.agencyId,
    memberId: req.validated.params.memberId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.MEMBERS_UPDATE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteAgencyMemberHandler = async (req, res) => {
  const data = await removeAgencyMember({
    agencyId: req.validated.params.agencyId,
    memberId: req.validated.params.memberId,
    actorUserId: req.user.id,
    permission: AGENCY_PERMISSIONS.MEMBERS_REMOVE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getAgencyRoles = async (req, res) => {
  const data = await listAgencyRoles({
    agencyId: req.validated.params.agencyId,
    userId: req.user.id,
    permission: AGENCY_PERMISSIONS.ROLES_READ
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postAgencyRole = async (req, res) => {
  const data = await createAgencyRole({
    agencyId: req.validated.params.agencyId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.ROLES_CREATE
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const patchAgencyRole = async (req, res) => {
  const data = await updateAgencyRole({
    agencyId: req.validated.params.agencyId,
    roleId: req.validated.params.roleId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.ROLES_UPDATE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteAgencyRoleHandler = async (req, res) => {
  const data = await deleteAgencyRole({
    agencyId: req.validated.params.agencyId,
    roleId: req.validated.params.roleId,
    actorUserId: req.user.id,
    permission: AGENCY_PERMISSIONS.ROLES_DELETE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getAgencyCalendarEvents = async (req, res) => {
  const data = await listAgencyCalendarEvents({
    agencyId: req.validated.params.agencyId,
    userId: req.user.id,
    permission: AGENCY_PERMISSIONS.CALENDAR_READ,
    filters: req.validated.query
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postAgencyCalendarEvent = async (req, res) => {
  const data = await createAgencyCalendarEvent({
    agencyId: req.validated.params.agencyId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.CALENDAR_CREATE
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const patchAgencyCalendarEvent = async (req, res) => {
  const data = await updateAgencyCalendarEvent({
    agencyId: req.validated.params.agencyId,
    eventId: req.validated.params.eventId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.CALENDAR_UPDATE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteAgencyCalendarEventHandler = async (req, res) => {
  const data = await deleteAgencyCalendarEvent({
    agencyId: req.validated.params.agencyId,
    eventId: req.validated.params.eventId,
    actorUserId: req.user.id,
    permission: AGENCY_PERMISSIONS.CALENDAR_DELETE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getAgencyExpenses = async (req, res) => {
  const data = await listAgencyExpenses({
    agencyId: req.validated.params.agencyId,
    userId: req.user.id,
    permission: AGENCY_PERMISSIONS.EXPENSES_READ
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postAgencyExpense = async (req, res) => {
  const data = await createAgencyExpense({
    agencyId: req.validated.params.agencyId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.EXPENSES_CREATE
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const patchAgencyExpense = async (req, res) => {
  const data = await updateAgencyExpense({
    agencyId: req.validated.params.agencyId,
    expenseId: req.validated.params.expenseId,
    actorUserId: req.user.id,
    payload: req.validated.body,
    permission: AGENCY_PERMISSIONS.EXPENSES_UPDATE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const approveAgencyExpenseHandler = async (req, res) => {
  const data = await approveAgencyExpense({
    agencyId: req.validated.params.agencyId,
    expenseId: req.validated.params.expenseId,
    actorUserId: req.user.id,
    permission: AGENCY_PERMISSIONS.EXPENSES_APPROVE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteAgencyExpenseHandler = async (req, res) => {
  const data = await deleteAgencyExpense({
    agencyId: req.validated.params.agencyId,
    expenseId: req.validated.params.expenseId,
    actorUserId: req.user.id,
    permission: AGENCY_PERMISSIONS.EXPENSES_DELETE
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getAgencyDashboardSummary = async (req, res) => {
  const data = await getAgencyStatsOverview({
    agencyId: req.validated.params.agencyId,
    userId: req.user.id,
    permission: AGENCY_PERMISSIONS.STATS_READ
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};
