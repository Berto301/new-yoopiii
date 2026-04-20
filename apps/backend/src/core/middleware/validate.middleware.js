import { StatusCodes } from "http-status-codes";

export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue, index) => {
      const pathSegments = issue.path.map((segment) => String(segment));
      const fieldSegments = pathSegments.filter((segment) => !["body", "params", "query"].includes(segment));

      return {
        order: index + 1,
        type: "validation_error",
        source: pathSegments[0] || "body",
        field: fieldSegments.join(".") || null,
        path: pathSegments.join("."),
        message: issue.message
      };
    });

    return next({
      message: "Validation failed",
      statusCode: StatusCodes.BAD_REQUEST,
      type: "validation_error",
      field: errors[0]?.field || null,
      details: parsed.error.flatten(),
      errors
    });
  }

  req.validated = parsed.data;
  return next();
};
