const request = require('supertest');
const { describeDb, connectTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');

describeDb('NFR-SEC-1 authenticate before access (deny by default)', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-06 any API route without a token returns 401, even unknown ones', async () => {
    for (const path of ['/api/users/me', '/api/conversations', '/api/anything']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    }
  });

  test('register, login and health stay public', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({})).status).toBe(400);
  });
});
