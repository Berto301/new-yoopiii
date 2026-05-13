import { StatusCodes } from "http-status-codes";
import {
  approveOwnerRentPayment,
  createOwnerRentPayment,
  createOwnerTenant,
  createOwnerMaintenanceTicket,
  deleteOwnerRentPayment,
  deleteOwnerTenant,
  deleteOwnerMaintenanceTicket,
  generateOwnerPropertyReceipt,
  getOwnerDashboard,
  getOwnerRentPayments,
  getOwnerPropertyTenantWorkspace,
  getOwnerTenantsManagement,
  getOwnerWorkspace,
  markOwnerPropertyFeedbackHandled,
  updateOwnerRentPayment,
  updateOwnerTenant,
  updateOwnerMaintenanceTicket
} from "./owner.service.js";

export const getOwnerDashboardHandler = async (req, res) => {
  const workspace = await getOwnerDashboard({ ownerId: req.user.id });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      summary: workspace.summary,
      revenueByProperty: workspace.revenueByProperty,
      upcomingDeadlines: workspace.upcomingDeadlines,
      recentMaintenance: workspace.recentMaintenance,
      alerts: workspace.alerts
    }
  });
};

export const getOwnerContractsHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.contracts });
};

export const getOwnerRentsHandler = async (req, res) => {
  const data = await getOwnerRentPayments({ ownerId: req.user.id, filters: req.query || {} });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getOwnerTenantsHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.tenants });
};

export const getOwnerTenantsManagementHandler = async (req, res) => {
  const data = await getOwnerTenantsManagement({ ownerId: req.user.id, filters: req.query || {} });
  res.status(StatusCodes.OK).json({ success: true, data });
};

export const createOwnerRentPaymentHandler = async (req, res) => {
  const data = await createOwnerRentPayment({
    ownerId: req.user.id,
    actorId: req.user.id,
    payload: req.validated.body,
    source: "owner"
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const updateOwnerRentPaymentHandler = async (req, res) => {
  const data = await updateOwnerRentPayment({
    ownerId: req.user.id,
    paymentId: req.validated.params.paymentId,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteOwnerRentPaymentHandler = async (req, res) => {
  const data = await deleteOwnerRentPayment({
    ownerId: req.user.id,
    paymentId: req.validated.params.paymentId,
    actorId: req.user.id
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const approveOwnerRentPaymentHandler = async (req, res) => {
  const data = await approveOwnerRentPayment({
    ownerId: req.user.id,
    paymentId: req.validated.params.paymentId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const createOwnerTenantHandler = async (req, res) => {
  const data = await createOwnerTenant({
    ownerId: req.user.id,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const updateOwnerTenantHandler = async (req, res) => {
  const data = await updateOwnerTenant({
    ownerId: req.user.id,
    tenantId: req.validated.params.tenantId,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteOwnerTenantHandler = async (req, res) => {
  const data = await deleteOwnerTenant({
    ownerId: req.user.id,
    tenantId: req.validated.params.tenantId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getOwnerPropertiesHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.properties });
};

export const getOwnerMaintenanceHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.maintenance });
};

export const createOwnerMaintenanceHandler = async (req, res) => {
  const data = await createOwnerMaintenanceTicket({
    ownerId: req.user.id,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const updateOwnerMaintenanceHandler = async (req, res) => {
  const data = await updateOwnerMaintenanceTicket({
    ownerId: req.user.id,
    ticketId: req.validated.params.ticketId,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const deleteOwnerMaintenanceHandler = async (req, res) => {
  const data = await deleteOwnerMaintenanceTicket({
    ownerId: req.user.id,
    ticketId: req.validated.params.ticketId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getOwnerPropertyTenantWorkspaceHandler = async (req, res) => {
  const data = await getOwnerPropertyTenantWorkspace({
    ownerId: req.user.id,
    propertyId: req.validated.params.propertyId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const generateOwnerPropertyReceiptHandler = async (req, res) => {
  const data = await generateOwnerPropertyReceipt({
    ownerId: req.user.id,
    propertyId: req.validated.params.propertyId,
    paymentId: req.validated.params.paymentId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const markOwnerPropertyFeedbackHandledHandler = async (req, res) => {
  const data = await markOwnerPropertyFeedbackHandled({
    ownerId: req.user.id,
    propertyId: req.validated.params.propertyId,
    feedbackId: req.validated.params.feedbackId
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};
