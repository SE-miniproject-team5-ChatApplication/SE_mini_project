const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const { verifyToken } = require('../../src/utils/jwt');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

const PASSWORD = 'secret123';

describeDb('REQ-AUTH-4 POST /api/auth/login', () => {
  const app = createApp();
  const login = (identifier, password) =>
    request(app).post('/api/auth/login').send({ identifier, password });
  let user;

  beforeAll(connectTestDb);
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    ({ user } = await createUser({ username: 'alice_1', email: 'alice@test.com', passwordHash }));
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-03 logs in by username and returns a valid 24 h token', async () => {
    const res = await login('alice_1', PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.expiresIn).toBe(86400);
    expect(verifyToken(res.body.token).sub).toBe(String(user._id));
    expect(res.body.user.username).toBe('alice_1');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('TC-AUTH-03 logs in by email, ignoring case', async () => {
    const res = await login('ALICE@test.com', PASSWORD);
    expect(res.status).toBe(200);
  });

  test('TC-AUTH-03 rejects a wrong password or unknown user with 401', async () => {
    expect((await login('alice_1', 'nope12345')).status).toBe(401);
    expect((await login('nobody', PASSWORD)).status).toBe(401);
  });

  test('TC-AUTH-03 rejects non-string input (NoSQL injection) with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: { $ne: '' }, password: PASSWORD });
    expect(res.status).toBe(401);
  });
});