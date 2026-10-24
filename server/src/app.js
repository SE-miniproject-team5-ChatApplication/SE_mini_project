// Builds the Express application (component C2 - REST API Layer).
// Route files in src/routes are loaded automatically: each one exports
// { basePath, router }, so a new feature only adds a file and never edits this one.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const { sanitizeBody } = require('./middleware/sanitize');
const { AppError, toErrorBody } = require('./utils/errors');
const { requireAuthExceptPublic } = require('./middleware/auth');

function loadRoutes(app) {
  const dir = path.join(__dirname, 'routes');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  for (const file of files) {
    const mod = require(path.join(dir, file));
    if (mod && mod.basePath && mod.router) app.use(mod.basePath, mod.router);
  }
}

// In production the server also serves the built React client (client/dist).
function serveClient(app) {
  const dist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (!fs.existsSync(dist)) return;
  app.use(express.static(dist));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeBody);
  app.use((req, _res, next) => {
    req.id = crypto.randomUUID();
    next();
  });

  // NFR-SEC-1: deny by default - every /api route needs a login except the public list.
  app.use('/api', requireAuthExceptPublic);

  loadRoutes(app);

  app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found')));
  serveClient(app);

  // Basic error handler - replaced by middleware/errorHandler.js in NFR-SAFE-4.
  app.use((err, req, res, _next) => {
    const status = err instanceof AppError ? err.status : 500;
    if (status >= 500) logger.error({ err, requestId: req.id }, 'request failed');
    res.status(status).json(toErrorBody(err, req.id));
  });

  return app;
}

module.exports = { createApp };
