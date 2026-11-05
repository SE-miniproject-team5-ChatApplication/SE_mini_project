// Entry point: starts the HTTP server.
const config = require('./config');
const { createHttpServer } = require('./config/tls');
const logger = require('./utils/logger');
const { createApp } = require('./app');
const { connectDb } = require('./config/db');
const { attachSockets } = require('./sockets');

async function start() {
  await connectDb();
  const app = createApp();
  const { server, protocol } = createHttpServer(app); // NFR-SEC-3: HTTPS/WSS when configured
  attachSockets(server);
  await new Promise((resolve) => server.listen(config.port, resolve));
  logger.info(`Server listening on ${protocol}://localhost:${config.port}`);
  return server;
}

// NFR-SAFE-4: log anything that escaped every other handler. A rejected promise
// is logged and the server keeps running; a truly unexpected exception leaves
// the process in an unknown state, so it is logged and the process exits
// (start it with a process manager such as pm2 / nodemon to restart it).
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception - exiting');
  process.exit(1);
});

if (require.main === module) {
  start().catch((err) => {
    logger.fatal({ err }, 'failed to start');
    process.exit(1);
  });
}

module.exports = { start };
