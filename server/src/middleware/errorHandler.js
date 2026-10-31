// NFR-SAFE-4: central error handler. One failing request never crashes the server
// and never leaks internal details: known errors keep their status and code,
// anything unexpected is logged with the request id and returned as a generic 500.
const logger = require('../utils/logger');
const { AppError, Errors, toErrorBody } = require('../utils/errors');

// Turns errors we understand into AppErrors; returns null for unexpected ones.
function normalise(err) {
  if (err instanceof AppError) return err;
  if (err && err.type === 'entity.parse.failed') return Errors.validation('Request body is not valid JSON');
  if (err && err.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  return null;
}

// Express recognises an error handler by its 4 arguments, so keep "next".
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err); // response already started: let Express close it
  const known = normalise(err);
  if (!known) {
    logger.error({ err, requestId: req.id, method: req.method, path: req.originalUrl }, 'request failed');
  }
  return res.status(known ? known.status : 500).json(toErrorBody(known || err, req.id));
}

module.exports = { errorHandler };
