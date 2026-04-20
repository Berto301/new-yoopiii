import { StatusCodes } from "http-status-codes";

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const normalizedErrors =
    error.errors ||
    (error.field || error.message
      ? [
          {
            order: 1,
            type: error.type || "request_error",
            field: error.field || null,
            message: error.message || "Internal server error"
          }
        ]
      : null);

  res.status(statusCode).json({
    success: false,
    type: error.type || "request_error",
    message: error.message || "Internal server error",
    field: error.field || normalizedErrors?.[0]?.field || null,
    details: error.details || null,
    errors: normalizedErrors
  });
};
