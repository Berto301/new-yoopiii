import { StatusCodes } from "http-status-codes";
import { Property } from "./property.model.js";
import { searchNearbyProperties } from "./properties.service.js";

export const getProperties = async (req, res) => {
  const { type, purpose, status } = req.query;
  const query = {};

  if (type) query.type = type;
  if (purpose) query.purpose = purpose;
  if (status) query.status = status;

  const properties = await Property.find(query).limit(50).lean();

  res.status(StatusCodes.OK).json({
    success: true,
    data: properties
  });
};

export const getNearbyProperties = async (req, res) => {
  const result = await searchNearbyProperties(req.validated.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};
