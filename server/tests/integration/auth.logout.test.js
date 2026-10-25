const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, waitFor } = require('../helpers/socket');
const { createUser } = require('../helpers/factory');
const { signToken } = require('../../src/utils/jwt');

describeDb('REQ-AUTH-6 logout', () => {
  let srv;
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(clearTestDb);
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-AUTH-05 logout closes this session socket and the token stops working', async () => {
    const { token, user } = await createUser();
    const other = signToken(user).token; // a second session (another tab/device)
    const s1 = await connectClient(srv.url, token);
    const s2 = await connectClient(srv.url, other);
    const closed = waitFor(s1, 'disconnect');

    const res = await request(srv.app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    await closed;

    expect((await request(srv.app).get('/api/users/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    await expect(connectClient(srv.url, token)).rejects.toThrow('UNAUTHENTICATED');
    // The other session is not affected.
    expect(s2.connected).toBe(true);
    expect((await request(srv.app).get('/api/users/me').set('Authorization', `Bearer ${other}`)).status).toBe(200);
    s2.close();
  });
});
