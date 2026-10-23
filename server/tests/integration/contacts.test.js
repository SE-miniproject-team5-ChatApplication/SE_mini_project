const request = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../../src/app');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

describeDb('REQ-PRO-4 /api/contacts', () => {
  const app = createApp();
  let me;
  let bob;
  const auth = (req, who = me) => req.set('Authorization', `Bearer ${who.token}`);
  const list = (who = me) => auth(request(app).get('/api/contacts'), who);
  const add = (contactUserId, who = me) => auth(request(app).post('/api/contacts').send({ contactUserId }), who);
  const remove = (id, who = me) => auth(request(app).delete(`/api/contacts/${id}`), who);

  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'alice_1' });
    bob = await createUser({ username: 'bob_1', displayName: 'Bob' });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-PRO-02 adds a contact and returns only public fields', async () => {
    const res = await add(bob.id);
    expect(res.status).toBe(201);
    expect(res.body.contact.id).toBe(bob.id);
    expect(res.body.contact.username).toBe('bob_1');
    expect(res.body.contact.email).toBeUndefined();
  });

  test('TC-PRO-02 lists my contacts', async () => {
    await add(bob.id);
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.username)).toEqual(['bob_1']);
  });

  test('TC-PRO-02 adding is one-way (bob does not get alice)', async () => {
    await add(bob.id);
    expect((await list(bob)).body).toEqual([]);
  });

  test('TC-PRO-02 cannot add myself', async () => {
    const res = await add(me.id);
    expect(res.status).toBe(400);
  });

  test('TC-PRO-02 cannot add the same contact twice', async () => {
    await add(bob.id);
    const res = await add(bob.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('TC-PRO-02 returns 404 for a user that does not exist', async () => {
    const res = await add(new mongoose.Types.ObjectId().toString());
    expect(res.status).toBe(404);
  });

  test('TC-PRO-02 rejects a missing or invalid contactUserId', async () => {
    expect((await add(undefined)).status).toBe(400);
    expect((await add('not-an-id')).status).toBe(400);
    expect((await add({ $gt: '' })).status).toBe(400);
  });

  test('TC-PRO-02 removes a contact', async () => {
    await add(bob.id);
    expect((await remove(bob.id)).status).toBe(204);
    expect((await list()).body).toEqual([]);
  });

  test('TC-PRO-02 removing someone who is not a contact returns 404', async () => {
    expect((await remove(bob.id)).status).toBe(404);
    expect((await remove('not-an-id')).status).toBe(404);
  });

  test('TC-PRO-02 requires a logged-in user', async () => {
    expect((await request(app).get('/api/contacts')).status).toBe(401);
  });
});