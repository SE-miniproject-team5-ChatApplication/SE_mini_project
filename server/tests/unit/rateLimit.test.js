const { createMessageLimiter } = require('../../src/middleware/rateLimit');

describe('NFR-SEC-6 message rate limit (20 per 10 s per user)', () => {
  test('TC-SEC-02 the 21st message within 10 s is refused, later ones allowed again', () => {
    const allow = createMessageLimiter();
    const t0 = 1000000;
    for (let i = 0; i < 20; i += 1) expect(allow('u1', t0 + i)).toBe(true);
    expect(allow('u1', t0 + 100)).toBe(false);
    expect(allow('u2', t0 + 100)).toBe(true); // other users are not affected
    expect(allow('u1', t0 + 10001)).toBe(true);
  });
});
