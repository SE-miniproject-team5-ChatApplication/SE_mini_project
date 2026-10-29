const request = require('supertest');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models');
const { MAX_FAILED_LOGINS } = require('../../src/services/authService');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

const PASSWORD = 'secret123';

describeDb('REQ-AUTH-5 account lockout', () => {
  const app = createApp();
  let me;
  const login = (password) =>
    request(app).post('/api/auth/login').send({ identifier: 'alice_1', password });

  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'alice_1', password: PASSWORD });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-04 wrong password and unknown user get the same generic message', async () => {
    const wrong = await login('nope12345');
    const unknown = await request(app).post('/api/auth/login').send({ identifier: 'nobody', password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  test('TC-AUTH-04 locks the account after 5 failed attempts, even for the right password', async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS; i += 1) {
      expect((await login('nope12345')).status).toBe(401);
    }
    const res = await login(PASSWORD);
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  test('TC-AUTH-04 4 failures do not lock the account', async () => {
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i += 1) await login('nope12345');
    expect((await login(PASSWORD)).status).toBe(200);
  });

  test('TC-AUTH-04 allows login again once the 15-minute lock has passed', async () => {
    await User.updateOne({ _id: me.id }, { failedLoginCount: 5, lockUntil: new Date(Date.now() - 1000) });
    expect((await login(PASSWORD)).status).toBe(200);
    const saved = await User.findById(me.id);
    expect(saved.failedLoginCount).toBe(0);
    expect(saved.lockUntil).toBeNull();
  });

  test('TC-AUTH-04 a successful login resets the failure counter', async () => {
    await login('nope12345');
    await login('nope12345');
    await login(PASSWORD);
    const saved = await User.findById(me.id);
    expect(saved.failedLoginCount).toBe(0);
  });
});
