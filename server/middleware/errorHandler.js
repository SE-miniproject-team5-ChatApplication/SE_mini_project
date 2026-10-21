
const pino = require('pino');

const logger = pino();

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;

  const code =
    status >= 500
      ? 'INTERNAL_ERROR'
      : err.code || 'VALIDATION_ERROR';

  logger.error(
    {
      requestId: req.requestId,
      status,
      route: req.path,
      err: {
        message: err.message,
        code,
      },
    },
    'Request failed'
  );

  const error = {
    code,
    message:
      status >= 500
        ? 'Internal server error'
        : err.message,
    requestId: req.requestId,
  };

  if (err.field) {
    error.field = err.field;
  }

  res.status(status).json({ error });
}

module.exports = errorHandler;
