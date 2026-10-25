const request = require('supertest');
const jwt = require('jsonwebtoken');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');

describeDb('REQ-AUTH-7 REST requests need a valid token', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-06 no token -> 401', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('TC-AUTH-06 expired token -> 401', async () => {
    const { id } = await createUser();
    const expired = jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test('TC-AUTH-06 tampered token -> 401', async () => {
    const { id } = await createUser();
    const forged = jwt.sign({ sub: id }, 'not-the-real-secret');
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('valid token -> 200 with the user profile', async () => {
    const { token, user } = await createUser();
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(user.username);
  });
});
