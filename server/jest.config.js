// Jest configuration (Test Plan section 5: unit + integration tests).
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/helpers/env.js'],
  testTimeout: 20000,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  // NFR-QA-5: backend statement coverage of at least 70 % (checked by `npm run test:ci` in CI).
  coverageThreshold: {
    global: { statements: 70 },
  },
};
