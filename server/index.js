
const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const errorHandler = require('./middleware/errorHandler');

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
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });
}

module.exports = app;
