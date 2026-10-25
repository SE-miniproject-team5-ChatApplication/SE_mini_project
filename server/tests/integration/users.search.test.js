const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');

describeDb('REQ-PRO-3 user search', () => {
  const app = createApp();
  let me;
  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'omkar' });
    await createUser({ username: 'prachi_j', displayName: 'Prachi Jalan' });
    await createUser({ username: 'pruthvi', displayName: 'Pruthviraj Patil' });
    await createUser({ username: 'raksha' });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  const search = (q) => request(app).get('/api/users/search').query({ q }).set('Authorization', `Bearer ${me.token}`);

  test('TC-PRO-02 "pra" matches case-insensitively by username or display name', async () => {
    const res = await search('PRA');
    expect(res.status).toBe(200);
    expect(res.body.map((u) => u.username)).toEqual(['prachi_j']);
    const res2 = await search('patil');
    expect(res2.body.map((u) => u.username)).toEqual(['pruthvi']);
  });

  test('the searching user is not in the results and no private fields are returned', async () => {
    const res = await search('omk');
    expect(res.body).toEqual([]);
    const res2 = await search('raks');
    expect(res2.body[0].email).toBeUndefined();
  });

  test('queries shorter than 2 characters are rejected', async () => {
    expect((await search('p')).status).toBe(400);
  });
});
