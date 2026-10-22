const { loadConfig, MIN_BCRYPT_ROUNDS } = require('../../src/config');

describe('NFR-SEC-2 secrets come from the environment', () => {
  test('TC-SEC-03 production refuses to start without a strong JWT secret', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) })).not.toThrow();
  });

  test('bcrypt cost factor is never below 10', () => {
    expect(loadConfig({ BCRYPT_ROUNDS: '4' }).bcryptRounds).toBe(MIN_BCRYPT_ROUNDS);
    expect(loadConfig({ BCRYPT_ROUNDS: '12' }).bcryptRounds).toBe(12);
  });

  test('tokens are valid for 24 hours', () => {
    expect(loadConfig({}).jwtExpiresIn).toBe('24h');
  });
});
