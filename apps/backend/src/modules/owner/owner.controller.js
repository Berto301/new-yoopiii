import { StatusCodes } from "http-status-codes";
import {
  createOwnerTenant,
  createOwnerMaintenanceTicket,
  deleteOwnerTenant,
  deleteOwnerMaintenanceTicket,
  getOwnerWorkspace,
  updateOwnerTenant,
  updateOwnerMaintenanceTicket
} from "./owner.service.js";

export const getOwnerDashboardHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });

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
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.rents });
};

export const getOwnerTenantsHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.tenants });
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
