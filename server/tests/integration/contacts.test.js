const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');

describeDb('REQ-PRO-4 contacts', () => {
  const app = createApp();
  let me;
  let other;
  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'omkar' });
    other = await createUser({ username: 'prachi' });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  const auth = (r) => r.set('Authorization', `Bearer ${me.token}`);

  test('TC-PRO-02 add, list, add again (409), add self (400), remove', async () => {
    const add = await auth(request(app).post('/api/contacts')).send({ contactUserId: other.id });
    expect(add.status).toBe(201);
    expect(add.body.username).toBe('prachi');

    const list = await auth(request(app).get('/api/contacts'));
    expect(list.body.map((u) => u.username)).toEqual(['prachi']);

    expect((await auth(request(app).post('/api/contacts')).send({ contactUserId: other.id })).status).toBe(409);
    expect((await auth(request(app).post('/api/contacts')).send({ contactUserId: me.id })).status).toBe(400);

    expect((await auth(request(app).delete(`/api/contacts/${other.id}`))).status).toBe(204);
    expect((await auth(request(app).get('/api/contacts'))).body).toEqual([]);
  });

  test('unknown user -> 404, bad id -> 400, removing a non-contact -> 404', async () => {
    expect((await auth(request(app).post('/api/contacts')).send({ contactUserId: '0123456789abcdef01234567' })).status).toBe(404);
    expect((await auth(request(app).post('/api/contacts')).send({ contactUserId: { $ne: null } })).status).toBe(400);
    expect((await auth(request(app).delete(`/api/contacts/${other.id}`))).status).toBe(404);
  });
});
