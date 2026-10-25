// Structured JSON logger (SAD 4.4). Never log passwords, tokens or message bodies:
// these fields are replaced with "[REDACTED]" wherever they appear in a log entry.
const pino = require('pino');
const config = require('../config');

const REDACT_PATHS = [
  'password',
  'currentPassword',
  'newPassword',
  'passwordHash',
  'token',
  'content',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.passwordHash',
  '*.token',
  '*.content',
  'req.headers.authorization',
];

const logger = pino({ level: config.logLevel, redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } });

module.exports = logger;
module.exports.REDACT_PATHS = REDACT_PATHS;
