// Central configuration. Every value comes from environment variables so that
// no secret or machine-specific setting is written in the source code.
const path = require('path');

// Tests load server/.env.test themselves (tests/helpers/env.js) so they can
// never touch the development database configured in server/.env.
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isTest: env === 'test',
  isProduction: env === 'production',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  port: Number(process.env.PORT) || 5000,
  mongoUrl: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/chatapp',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL || (env === 'test' ? 'silent' : 'info'),
};

module.exports = config;
