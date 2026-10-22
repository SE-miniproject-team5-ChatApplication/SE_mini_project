// Entry point: starts the HTTP server.
const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const { createApp } = require('./app');
const { connectDb } = require('./config/db');

async function start() {
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(config.port, resolve));
  logger.info(`Server listening on http://localhost:${config.port}`);
  return server;
}

if (require.main === module) {
  start().catch((err) => {
    logger.fatal({ err }, 'failed to start');
    process.exit(1);
  });
}

module.exports = { start };
