import { StatusCodes } from "http-status-codes";

export const validate = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (!parsed.success) {
    return next({
      message: "Validation failed",
      statusCode: StatusCodes.BAD_REQUEST,
      details: parsed.error.flatten()
    });
  }

  req.validated = parsed.data;
  return next();
};
