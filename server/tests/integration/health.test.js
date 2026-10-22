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
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });
});
