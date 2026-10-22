// Standard error format shared by REST and socket handlers (SAD 4.4):
// { "error": { "code": "VALIDATION_ERROR", "message": "...", "field": "password", "requestId": "..." } }

class AppError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (field) this.field = field;
  }
}

const Errors = {
  validation: (message, field) => new AppError(400, 'VALIDATION_ERROR', message, field),
  unauthenticated: (message = 'Authentication required') => new AppError(401, 'UNAUTHENTICATED', message),
  invalidCredentials: () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username/email or password'),
  forbidden: (message = 'You are not allowed to do this') => new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Not found') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message, field) => new AppError(409, 'CONFLICT', message, field),
  fileTooLarge: (message = 'File is too large') => new AppError(413, 'FILE_TOO_LARGE', message),
  unsupportedType: (message = 'File type not allowed') => new AppError(415, 'UNSUPPORTED_TYPE', message),
  locked: (message) => new AppError(423, 'ACCOUNT_LOCKED', message),
  rateLimited: (message = 'Too many requests, slow down') => new AppError(429, 'RATE_LIMITED', message),
  internal: () => new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'),
};

// Turns any error into the standard body. Unknown errors never leak details.
function toErrorBody(err, requestId) {
  const known = err instanceof AppError;
  const body = {
    code: known ? err.code : 'INTERNAL_ERROR',
    message: known ? err.message : 'Something went wrong. Please try again.',
  };
  if (known && err.field) body.field = err.field;
  if (requestId) body.requestId = requestId;
  return { error: body };
}

module.exports = { AppError, Errors, toErrorBody };
