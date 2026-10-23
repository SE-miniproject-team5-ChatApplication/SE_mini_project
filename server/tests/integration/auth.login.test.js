const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models');
const { verifyToken } = require('../../src/utils/jwt');
const { MAX_FAILED_ATTEMPTS } = require('../../src/services/authService');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

const PASSWORD = 'secret123';

describeDb('REQ-AUTH-4/5 POST /api/auth/login', () => {
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

  test('TC-AUTH-04 wrong password and unknown user get the same generic 401', async () => {
    const wrong = await login('alice_1', 'nope12345');
    const unknown = await login('nobody', PASSWORD);
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  test('TC-AUTH-04 locks the account after 5 failed attempts, even for the right password', async () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      const res = await login('alice_1', 'nope12345');
      expect(res.status).toBe(401);
    }
    const res = await login('alice_1', PASSWORD);
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  test('TC-AUTH-04 allows login again once the lock has expired', async () => {
    await User.updateOne({ _id: user._id }, { failedLoginCount: 5, lockUntil: new Date(Date.now() - 1000) });
    const res = await login('alice_1', PASSWORD);
    expect(res.status).toBe(200);
    const saved = await User.findById(user._id);
    expect(saved.failedLoginCount).toBe(0);
    expect(saved.lockUntil).toBeNull();
  });

  test('TC-AUTH-04 a successful login resets the failure counter', async () => {
    await login('alice_1', 'nope12345');
    await login('alice_1', 'nope12345');
    await login('alice_1', PASSWORD);
    const saved = await User.findById(user._id);
    expect(saved.failedLoginCount).toBe(0);
  });

  test('TC-AUTH-04 rejects non-string input (NoSQL injection) with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: { $ne: '' }, password: PASSWORD });
    expect(res.status).toBe(401);
  });
});