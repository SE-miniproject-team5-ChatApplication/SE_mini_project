// Entry point: starts the HTTP server.
const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const { createApp } = require('./app');
const { connectDb } = require('./config/db');
const { attachSockets } = require('./sockets');

async function start() {
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);
  attachSockets(server);
  await new Promise((resolve) => server.listen(config.port, resolve));
  logger.info(`Server listening on http://localhost:${config.port}`);
  return server;
}

if (require.main === module) {
  // NFR-SAFE-4: a forgotten promise somewhere must not stop the server.
  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled promise rejection'));
  start().catch((err) => {
    logger.fatal({ err }, 'failed to start');
    process.exit(1);
  });
}

module.exports = { start };
