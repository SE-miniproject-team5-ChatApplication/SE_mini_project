const request = require('supertest');
const { createApp } = require('../../src/app');
const { SEARCH_LIMIT } = require('../../src/services/userService');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

describeDb('REQ-PRO-3 GET /api/users/search', () => {
  const app = createApp();
  let me;
  const search = (q, token = me.token) =>
    request(app).get('/api/users/search').query(q === undefined ? {} : { q }).set('Authorization', `Bearer ${token}`);

  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'alice_me', displayName: 'Me Myself' });
    await createUser({ username: 'alice_1', displayName: 'Alice Smith' });
    await createUser({ username: 'alicia', displayName: 'Alicia Keys' });
    await createUser({ username: 'bob', displayName: 'Bob Smith' });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-PRO-02 finds users by partial username, ignoring case, and leaves out the searcher', async () => {
    const res = await search('ALI');
    expect(res.status).toBe(200);
    expect(res.body.map((u) => u.username)).toEqual(['alice_1', 'alicia']);
  });

  test('TC-PRO-02 finds users by display name', async () => {
    const res = await search('smith');
    expect(res.body.map((u) => u.username)).toEqual(['alice_1', 'bob']);
  });

  test('TC-PRO-02 returns only public fields', async () => {
    const res = await search('bob');
    expect(Object.keys(res.body[0]).sort()).toEqual(['displayName', 'userId', 'username']);
  });

  test('TC-PRO-02 rejects a search shorter than 2 characters', async () => {
    expect((await search('a')).status).toBe(400);
    expect((await search()).status).toBe(400);
  });

  test('TC-PRO-02 treats regex symbols as plain text', async () => {
    const res = await search('.*');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('TC-PRO-02 returns at most SEARCH_LIMIT results', async () => {
    for (let i = 0; i < SEARCH_LIMIT + 5; i += 1) {
      await createUser({ username: `zed_${i}`, displayName: 'Zed' });
    }
    const res = await search('zed');
    expect(res.body).toHaveLength(SEARCH_LIMIT);
  });

  test('TC-PRO-02 requires a logged-in user', async () => {
    const res = await request(app).get('/api/users/search?q=ali');
    expect(res.status).toBe(401);
  });
});