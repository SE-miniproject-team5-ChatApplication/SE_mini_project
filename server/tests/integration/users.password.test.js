const request = require('supertest');
const { createApp } = require('../../src/app');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

const OLD = 'oldpass123';
const NEW = 'newpass456';

describeDb('REQ-PRO-5 PUT /api/auth/password', () => {
  const app = createApp();
  let me;
  const change = (body, token = me.token) =>
    request(app).put('/api/auth/password').set('Authorization', `Bearer ${token}`).send(body);
  const login = (password) =>
    request(app).post('/api/auth/login').send({ identifier: 'alice_1', password });

  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'alice_1', password: OLD });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-PRO-03 changes the password; new one works, old one does not', async () => {
    const res = await change({ currentPassword: OLD, newPassword: NEW });
    expect(res.status).toBe(204);
    expect((await login(NEW)).status).toBe(200);
    expect((await login(OLD)).status).toBe(401);
  });

  test('TC-PRO-03 wrong current password gives 403 and keeps the old password', async () => {
    const res = await change({ currentPassword: 'wrongpass1', newPassword: NEW });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await login(OLD)).status).toBe(200);
  });

  test.each([
    ['too short', 'abc12'],
    ['no digit', 'abcdefgh'],
    ['no letter', '12345678'],
    ['not text', { $gt: '' }],
  ])('TC-PRO-03 rejects a weak new password (%s) with 400', async (_name, newPassword) => {
    const res = await change({ currentPassword: OLD, newPassword });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('newPassword');
  });

  test('TC-PRO-03 rejects a missing current password', async () => {
    const res = await change({ newPassword: NEW });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('currentPassword');
  });

  test('TC-PRO-03 rejects a new password equal to the current one', async () => {
    const res = await change({ currentPassword: OLD, newPassword: OLD });
    expect(res.status).toBe(400);
  });

  test('TC-PRO-03 requires a logged-in user', async () => {
    const res = await request(app).put('/api/auth/password').send({ currentPassword: OLD, newPassword: NEW });
    expect(res.status).toBe(401);
  });
});
