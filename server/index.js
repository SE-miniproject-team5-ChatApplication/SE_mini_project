
const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');

const app = express();
const logger = pino();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Attach a request ID and log request completion.
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  const startedAt = Date.now();

  res.on('finish', () => {
    logger.info({
      requestId: req.requestId,
      userId: req.user?.id,
      route: req.route?.path || req.path,
      status: res.statusCode,
      latency: Date.now() - startedAt,
    }, 'Request completed');
  });

  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Central error handler
app.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  const code = status >= 500
    ? 'INTERNAL_ERROR'
    : (err.code || 'VALIDATION_ERROR');

  logger.error({
    requestId: req.requestId,
    status,
    route: req.path,
    err: {
      message: err.message,
      code,
    },
  }, 'Request failed');

  const error = {
    code,
    message: status >= 500
      ? 'Internal server error'
      : err.message,
    requestId: req.requestId,
  };

  if (err.field) {
    error.field = err.field;
  }

  res.status(status).json({ error });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });
}

module.exports = app;
