const request = require('supertest');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

describeDb('REQ-PRO-1 GET/PUT /api/users/me', () => {
  const app = createApp();
  let me;
  const get = () => request(app).get('/api/users/me').set('Authorization', `Bearer ${me.token}`);
  const put = (body) => request(app).put('/api/users/me').set('Authorization', `Bearer ${me.token}`).send(body);

  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'alice_1', displayName: 'Alice' });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-PRO-01 shows my own profile including my email', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice_1');
    expect(res.body.email).toBe('alice_1@test.com');
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('TC-PRO-01 updates display name and status message', async () => {
    const res = await put({ displayName: '  Alice S  ', statusMessage: 'Busy studying' });
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Alice S');
    expect(res.body.statusMessage).toBe('Busy studying');

    const saved = await User.findById(me.id);
    expect(saved.displayName).toBe('Alice S');
    expect(saved.statusMessage).toBe('Busy studying');
  });

  test('TC-PRO-01 can update just one field', async () => {
    const res = await put({ statusMessage: 'Hi' });
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Alice');
    expect(res.body.statusMessage).toBe('Hi');
  });

  test('TC-PRO-01 can clear the status message', async () => {
    await put({ statusMessage: 'Hi' });
    const res = await put({ statusMessage: '' });
    expect(res.status).toBe(200);
    expect(res.body.statusMessage).toBe('');
  });

  test.each([
    ['empty display name', { displayName: '   ' }, 'displayName'],
    ['display name over 40 chars', { displayName: 'a'.repeat(41) }, 'displayName'],
    ['display name not text', { displayName: { $gt: '' } }, 'displayName'],
    ['status over 100 chars', { statusMessage: 'a'.repeat(101) }, 'statusMessage'],
    ['status not text', { statusMessage: 42 }, 'statusMessage'],
  ])('TC-PRO-01 rejects %s with 400', async (_name, body, field) => {
    const res = await put(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
  });

  test('TC-PRO-01 rejects an empty update', async () => {
    expect((await put({})).status).toBe(400);
  });

  test('TC-PRO-01 cannot change username or email this way', async () => {
    await put({ displayName: 'New', username: 'hacker', email: 'h@test.com' });
    const saved = await User.findById(me.id);
    expect(saved.username).toBe('alice_1');
    expect(saved.email).toBe('alice_1@test.com');
  });

  test('TC-PRO-01 requires a logged-in user', async () => {
    const res = await request(app).put('/api/users/me').send({ displayName: 'X' });
    expect(res.status).toBe(401);
  });
});