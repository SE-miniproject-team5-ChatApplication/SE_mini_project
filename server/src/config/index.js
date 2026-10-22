// Central configuration. Every value comes from environment variables so that
// no secret or machine-specific setting is written in the source code (NFR-SEC-2).
const path = require('path');

// Tests load server/.env.test themselves (tests/helpers/env.js) so they can
// never touch the development database configured in server/.env.
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}

const SERVER_ROOT = path.join(__dirname, '..', '..');
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';
const MIN_SECRET_LENGTH = 32;
const MIN_BCRYPT_ROUNDS = 10; // REQ-AUTH-3: cost factor of at least 10

function loadConfig(vars = process.env) {
  const env = vars.NODE_ENV || 'development';
  const isProduction = env === 'production';

  let jwtSecret = vars.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < MIN_SECRET_LENGTH) {
    if (isProduction) {
      throw new Error(`JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters in production`);
    }
    jwtSecret = jwtSecret || DEV_FALLBACK_SECRET;
  }

  return {
    env,
    isTest: env === 'test',
    isProduction,
    port: Number(vars.PORT) || 5000,
    mongoUrl: vars.MONGO_URL || 'mongodb://127.0.0.1:27017/chatapp',
    clientOrigin: vars.CLIENT_ORIGIN || 'http://localhost:5173',
    logLevel: vars.LOG_LEVEL || (env === 'test' ? 'silent' : 'info'),
    jwtSecret,
    jwtExpiresIn: '24h', // REQ-AUTH-4: tokens are valid for 24 hours
    bcryptRounds: Math.max(MIN_BCRYPT_ROUNDS, Number(vars.BCRYPT_ROUNDS) || MIN_BCRYPT_ROUNDS),
    uploadDir: path.resolve(SERVER_ROOT, vars.UPLOAD_DIR || 'uploads'),
  };
}

const config = loadConfig();

module.exports = config;
module.exports.loadConfig = loadConfig;
module.exports.MIN_BCRYPT_ROUNDS = MIN_BCRYPT_ROUNDS;
