const request = require('supertest');
const jwt = require('jsonwebtoken');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');

describeDb('REQ-AUTH-4 login', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  beforeEach(() => createUser({ username: 'omkar_01', email: 'omkar@test.com', password: 'Chat1234' }));
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-03 login with email returns a token valid for 24 hours', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: 'omkar@test.com', password: 'Chat1234' });
    expect(res.status).toBe(200);
    const payload = jwt.decode(res.body.token);
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
    expect(res.body.user.username).toBe('omkar_01');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('TC-AUTH-03 login with username (any case) works', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: 'OMKAR_01', password: 'Chat1234' });
    expect(res.status).toBe(200);
  });

  test('wrong password and unknown user give the same generic 401', async () => {
    const a = await request(app).post('/api/auth/login').send({ identifier: 'omkar_01', password: 'Wrong1234' });
    const b = await request(app).post('/api/auth/login').send({ identifier: 'nobody', password: 'Wrong1234' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });
});
