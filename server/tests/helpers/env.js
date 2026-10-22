// Runs before every test file. Tests never read server/.env (the development
// database); they use server/.env.test or the variables set by CI.
const path = require('path');

process.env.NODE_ENV = 'test';
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-test-secret-that-is-long-enough-1234567890';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
