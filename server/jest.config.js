// Jest configuration (Test Plan section 5: unit + integration tests).
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/helpers/env.js'],
  testTimeout: 20000,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};
