const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models');

describeDb('REQ-AUTH-1 register', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-01 valid details create the user with a bcrypt hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'omkar_01', email: 'omkar@test.com', password: 'Chat1234' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('omkar_01');
    const stored = await User.findOne({ username: 'omkar_01' }).select('+passwordHash');
    expect(stored.passwordHash.startsWith('$2b$')).toBe(true);
    expect(stored.passwordHash).not.toBe('Chat1234');
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('TC-AUTH-02 invalid input returns 400 with the field name and creates nothing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', email: 'ab@test.com', password: 'Chat1234' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('username');
    expect(await User.countDocuments()).toBe(0);
  });
});

describeDb('REQ-AUTH-2 duplicate registration', () => {
  const app = createApp();
  const register = (body) => request(app).post('/api/auth/register').send(body);
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-02 (c) an existing email returns 409 with field "email"', async () => {
    await register({ username: 'prachi', email: 'prachi@test.com', password: 'Chat1234' });
    const res = await register({ username: 'prachi2', email: 'PRACHI@test.com', password: 'Chat1234' });
    expect(res.status).toBe(409);
    expect(res.body.error.field).toBe('email');
    expect(await User.countDocuments()).toBe(1);
  });

  test('an existing username (any letter case) returns 409 with field "username"', async () => {
    await register({ username: 'prachi', email: 'prachi@test.com', password: 'Chat1234' });
    const res = await register({ username: 'Prachi', email: 'other@test.com', password: 'Chat1234' });
    expect(res.status).toBe(409);
    expect(res.body.error.field).toBe('username');
  });
});
