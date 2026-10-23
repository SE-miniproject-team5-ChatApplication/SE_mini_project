const request = require('supertest');
const { io: connectClient } = require('socket.io-client');
const bus = require('../../src/utils/eventBus');
const { RevokedToken } = require('../../src/models');
const { signToken } = require('../../src/utils/jwt');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');
const { startTestServer } = require('../helpers/server');

function connect(url, token) {
  return new Promise((resolve, reject) => {
    const s = connectClient(url, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
    s.once('session:ready', () => resolve(s));
    s.once('connect_error', (err) => {
      s.close();
      reject(err);
    });
  });
}

describeDb('REQ-AUTH-6 POST /api/auth/logout', () => {
  let srv;
  const sockets = [];
  const logout = (token) => request(srv.url).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    sockets.splice(0).forEach((s) => s.close());
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-AUTH-05 returns 204 and the same token stops working', async () => {
    const { token } = await createUser();
    expect((await logout(token)).status).toBe(204);
    expect((await logout(token)).status).toBe(401);
    expect(await RevokedToken.countDocuments()).toBe(1);
  });

  test('TC-AUTH-05 requires a valid token', async () => {
    const res = await request(srv.url).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  test('TC-AUTH-05 other sessions of the same user keep working', async () => {
    const { user, token } = await createUser();
    const other = signToken(user).token;
    await logout(token);
    expect((await logout(other)).status).toBe(204);
  });

  test("TC-AUTH-05 closes only this session's socket", async () => {
    const { user, token } = await createUser();
    const other = signToken(user).token;
    const a = await connect(srv.url, token);
    const b = await connect(srv.url, other);
    sockets.push(a, b);

    const closed = new Promise((resolve) => a.once('disconnect', resolve));
    await logout(token);
    await closed;
    expect(a.connected).toBe(false);
    expect(b.connected).toBe(true);
  });

  test('TC-AUTH-05 a logged-out token cannot open a new socket', async () => {
    const { token } = await createUser();
    await logout(token);
    await expect(connect(srv.url, token)).rejects.toThrow();
  });

  test('TC-AUTH-05 announces user:logout so presence can set the user offline', async () => {
    const { token, id } = await createUser();
    const heard = new Promise((resolve) => bus.once('user:logout', resolve));
    await logout(token);
    await expect(heard).resolves.toEqual({ userId: id });
  });
});