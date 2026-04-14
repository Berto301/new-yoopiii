import { StatusCodes } from "http-status-codes";
import { getOwnerWorkspace } from "./owner.service.js";

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

export const getOwnerPropertiesHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.properties });
};

export const getOwnerMaintenanceHandler = async (req, res) => {
  const workspace = await getOwnerWorkspace({ ownerId: req.user.id });
  res.status(StatusCodes.OK).json({ success: true, data: workspace.maintenance });
};
