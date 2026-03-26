import { Router } from "express";
import { requireAuth } from "../../core/middleware/auth.middleware.js";
import { validate } from "../../core/middleware/validate.middleware.js";
import { asyncHandler } from "../../core/utils/async-handler.js";
import {
  agencyIdParamsSchema,
  createAgencyMemberSchema,
  createCalendarEventSchema,
  createExpenseSchema,
  createRoleTemplateSchema,
  listCalendarEventsSchema,
  updateAgencyMemberSchema,
  updateCalendarEventSchema,
  updateExpenseSchema,
  updateRoleTemplateSchema
} from "./agencies.validation.js";
import {
  approveAgencyExpenseHandler,
  deleteAgencyCalendarEventHandler,
  deleteAgencyExpenseHandler,
  deleteAgencyMemberHandler,
  deleteAgencyRoleHandler,
  getAgencyCalendarEvents,
  getAgencyDashboardSummary,
  getAgencyExpenses,
  getAgencyMembers,
  getAgencyRoles,
  getAgencies,
  patchAgencyCalendarEvent,
  patchAgencyExpense,
  patchAgencyMember,
  patchAgencyRole,
  postAgencyCalendarEvent,
  postAgencyExpense,
  postAgencyMember,
  postAgencyRole
} from "./agencies.controller.js";

export const agencyRouter = Router();

agencyRouter.get("/", asyncHandler(getAgencies));
agencyRouter.use(asyncHandler(requireAuth));
agencyRouter.get("/:agencyId/dashboard/summary", validate(agencyIdParamsSchema), asyncHandler(getAgencyDashboardSummary));
agencyRouter.get("/:agencyId/members", validate(agencyIdParamsSchema), asyncHandler(getAgencyMembers));
agencyRouter.post("/:agencyId/members", validate(createAgencyMemberSchema), asyncHandler(postAgencyMember));
agencyRouter.patch("/:agencyId/members/:memberId", validate(updateAgencyMemberSchema), asyncHandler(patchAgencyMember));
agencyRouter.delete("/:agencyId/members/:memberId", validate(updateAgencyMemberSchema), asyncHandler(deleteAgencyMemberHandler));
agencyRouter.get("/:agencyId/roles", validate(agencyIdParamsSchema), asyncHandler(getAgencyRoles));
agencyRouter.post("/:agencyId/roles", validate(createRoleTemplateSchema), asyncHandler(postAgencyRole));
agencyRouter.patch("/:agencyId/roles/:roleId", validate(updateRoleTemplateSchema), asyncHandler(patchAgencyRole));
agencyRouter.delete("/:agencyId/roles/:roleId", validate(updateRoleTemplateSchema), asyncHandler(deleteAgencyRoleHandler));
agencyRouter.get("/:agencyId/calendar/events", validate(listCalendarEventsSchema), asyncHandler(getAgencyCalendarEvents));
agencyRouter.post("/:agencyId/calendar/events", validate(createCalendarEventSchema), asyncHandler(postAgencyCalendarEvent));
agencyRouter.patch("/:agencyId/calendar/events/:eventId", validate(updateCalendarEventSchema), asyncHandler(patchAgencyCalendarEvent));
agencyRouter.delete("/:agencyId/calendar/events/:eventId", validate(updateCalendarEventSchema), asyncHandler(deleteAgencyCalendarEventHandler));
agencyRouter.get("/:agencyId/expenses", validate(agencyIdParamsSchema), asyncHandler(getAgencyExpenses));
agencyRouter.post("/:agencyId/expenses", validate(createExpenseSchema), asyncHandler(postAgencyExpense));
agencyRouter.patch("/:agencyId/expenses/:expenseId", validate(updateExpenseSchema), asyncHandler(patchAgencyExpense));
agencyRouter.patch("/:agencyId/expenses/:expenseId/approve", validate(updateExpenseSchema), asyncHandler(approveAgencyExpenseHandler));
agencyRouter.delete("/:agencyId/expenses/:expenseId", validate(updateExpenseSchema), asyncHandler(deleteAgencyExpenseHandler));
