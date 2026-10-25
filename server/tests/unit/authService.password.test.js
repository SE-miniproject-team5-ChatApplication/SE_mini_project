const pino = require('pino');
const { Writable } = require('stream');
const { hashPassword, verifyPassword } = require('../../src/services/authService');
const { REDACT_PATHS } = require('../../src/utils/logger');

describe('REQ-AUTH-3 bcrypt password hashing', () => {
  test('TC-AUTH-01 hash starts with $2b$, cost >= 10 and differs from the password', async () => {
    const hash = await hashPassword('Chat1234');
    expect(hash.startsWith('$2b$')).toBe(true);
    expect(Number(hash.split('$')[2])).toBeGreaterThanOrEqual(10);
    expect(hash).not.toContain('Chat1234');
  });

  test('same password gives a different hash each time (salted)', async () => {
    expect(await hashPassword('Chat1234')).not.toBe(await hashPassword('Chat1234'));
  });

  test('verifyPassword accepts the right password only', async () => {
    const hash = await hashPassword('Chat1234');
    expect(await verifyPassword('Chat1234', hash)).toBe(true);
    expect(await verifyPassword('chat1234', hash)).toBe(false);
    expect(await verifyPassword({ $gt: '' }, hash)).toBe(false);
  });

  test('TC-AUTH-01 passwords never appear in logs', () => {
    let output = '';
    const sink = new Writable({
      write(chunk, _enc, cb) {
        output += chunk.toString();
        cb();
      },
    });
    const log = pino({ redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } }, sink);
    log.info({ body: { password: 'Chat1234' }, password: 'Chat1234' }, 'register');
    expect(output).not.toContain('Chat1234');
    expect(output).toContain('[REDACTED]');
  });
});
