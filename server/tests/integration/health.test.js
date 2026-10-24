const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Smoke test - health endpoint', () => {
  const app = createApp();

  test('SMOKE GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('SMOKE unknown API route returns the standard error format', async () => {
    // Without a token the global guard answers first (NFR-SEC-1).
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.body.error.requestId).toBeDefined();
  });
});
