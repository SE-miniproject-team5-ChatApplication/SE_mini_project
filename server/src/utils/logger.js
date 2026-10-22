// Structured JSON logger (SAD 4.4). Never log passwords, tokens or message bodies.
const pino = require('pino');
const config = require('../config');

const logger = pino({ level: config.logLevel });

module.exports = logger;
