export class AppError extends Error {
  constructor(message, statusCode = 500, details = null, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.type = options.type || null;
    this.field = options.field || null;
    this.errors = options.errors || null;
  }
}
