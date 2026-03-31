import { StatusCodes } from "http-status-codes";
import { Property } from "./property.model.js";
import {
  addPropertyToFavorites,
  createManagedProperty,
  deleteManagedProperty,
  duplicateManagedProperty,
  getManagedProperties,
  getPropertyFavorites,
  getPropertyHistory,
  markPropertyAsViewed,
  removePropertyFromFavorites,
  searchNearbyProperties,
  searchPropertiesInBounds,
  updateManagedProperty,
  updatePropertyWorkflow
} from "./properties.service.js";

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
  const result = await searchNearbyProperties(req.validated.query, req.user || null);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const getPropertiesInBounds = async (req, res) => {
  const result = await searchPropertiesInBounds(req.validated.query, req.user || null);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result
  });
};

export const getManagedPropertiesHandler = async (req, res) => {
  const data = await getManagedProperties({
    user: req.user,
    filters: req.validated.query
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postManagedPropertyHandler = async (req, res) => {
  const data = await createManagedProperty({
    actor: req.user,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const patchManagedPropertyHandler = async (req, res) => {
  const data = await updateManagedProperty({
    propertyId: req.validated.params.propertyId,
    actor: req.user,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const duplicateManagedPropertyHandler = async (req, res) => {
  const data = await duplicateManagedProperty({
    propertyId: req.validated.params.propertyId,
    actor: req.user,
    payload: req.validated.body
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const deleteManagedPropertyHandler = async (req, res) => {
  const data = await deleteManagedProperty({
    propertyId: req.validated.params.propertyId,
    actor: req.user
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const patchPropertyWorkflowHandler = async (req, res) => {
  const data = await updatePropertyWorkflow({
    propertyId: req.validated.params.propertyId,
    actor: req.user,
    payload: req.validated.body
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postPropertyFavoriteHandler = async (req, res) => {
  const data = await addPropertyToFavorites({
    propertyId: req.validated.params.propertyId,
    userId: req.user.id
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const deletePropertyFavoriteHandler = async (req, res) => {
  const data = await removePropertyFromFavorites({
    propertyId: req.validated.params.propertyId,
    userId: req.user.id
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const getFavoritePropertiesHandler = async (req, res) => {
  const data = await getPropertyFavorites({
    userId: req.user.id,
    filters: req.validated.query
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};

export const postPropertyViewHandler = async (req, res) => {
  const data = await markPropertyAsViewed({
    propertyId: req.validated.params.propertyId,
    userId: req.user.id,
    source: req.validated.body.source || "detail"
  });

  res.status(StatusCodes.CREATED).json({ success: true, data });
};

export const getPropertyHistoryHandler = async (req, res) => {
  const data = await getPropertyHistory({
    userId: req.user.id,
    filters: req.validated.query
  });

  res.status(StatusCodes.OK).json({ success: true, data });
};
