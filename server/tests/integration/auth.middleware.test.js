const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');
const { requireAuth } = require('../../src/middleware/auth');
const { AppError, toErrorBody } = require('../../src/utils/errors');
const { User } = require('../../src/models');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

// A tiny app with one protected route, to test the middleware on its own
function makeApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => res.json({ userId: req.user.id }));
  app.use((err, _req, res, _next) => {
    res.status(err instanceof AppError ? err.status : 500).json(toErrorBody(err));
  });
  return app;
}

describeDb('REQ-AUTH-7 requireAuth middleware', () => {
  const app = makeApp();
  const get = (authHeader) => {
    const req = request(app).get('/protected');
    return authHeader ? req.set('Authorization', authHeader) : req;
  };

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-06 allows a request with a valid token', async () => {
    const { token, id } = await createUser();
    const res = await get(`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(id);
  });

  test('TC-AUTH-06 rejects a request with no token', async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('TC-AUTH-06 rejects a header that is not "Bearer <token>"', async () => {
    const { token } = await createUser();
    expect((await get(`Basic ${token}`)).status).toBe(401);
    expect((await get('Bearer')).status).toBe(401);
  });

  test('TC-AUTH-06 rejects a malformed token', async () => {
    expect((await get('Bearer not.a.token')).status).toBe(401);
  });

  test('TC-AUTH-06 rejects a token signed with a different secret (tampered)', async () => {
    const { id } = await createUser();
    const fake = jwt.sign({ sub: id }, 'some-other-secret-that-is-long-enough-123', { algorithm: 'HS256' });
    expect((await get(`Bearer ${fake}`)).status).toBe(401);
  });

  test('TC-AUTH-06 rejects an expired token', async () => {
    const { id } = await createUser();
    const expired = jwt.sign(
      { sub: id, exp: Math.floor(Date.now() / 1000) - 10 },
      config.jwtSecret,
      { algorithm: 'HS256' }
    );
    expect((await get(`Bearer ${expired}`)).status).toBe(401);
  });

  test('TC-AUTH-06 rejects a valid token for a user that no longer exists', async () => {
    const { token, id } = await createUser();
    await User.deleteOne({ _id: id });
    expect((await get(`Bearer ${token}`)).status).toBe(401);
  });
});