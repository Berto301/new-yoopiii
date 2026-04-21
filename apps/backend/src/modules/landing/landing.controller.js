import { StatusCodes } from "http-status-codes";
import { getLandingOverview } from "./landing.service.js";

export const getLandingOverviewHandler = async (_req, res) => {
  const data = await getLandingOverview();

  res.status(StatusCodes.OK).json({
    success: true,
    data
  });
};
