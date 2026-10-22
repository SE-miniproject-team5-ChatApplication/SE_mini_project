const jwt = require('jsonwebtoken');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, waitFor } = require('../helpers/socket');
const { createUser } = require('../helpers/factory');
const { emitToUser } = require('../../src/utils/realtime');

describeDb('SET-4 Socket Gateway JWT handshake (C3)', () => {
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

  test('TC-AUTH-06 handshake without a token fails with connect_error', async () => {
    await expect(connectClient(srv.url, undefined)).rejects.toThrow('UNAUTHENTICATED');
  });

  test('TC-AUTH-06 tampered and expired tokens are rejected', async () => {
    const { token } = await createUser();
    await expect(connectClient(srv.url, token.slice(0, -2) + 'xx')).rejects.toThrow('UNAUTHENTICATED');
    const expired = jwt.sign({ sub: 'x' }, process.env.JWT_SECRET, { expiresIn: -10 });
    await expect(connectClient(srv.url, expired)).rejects.toThrow('UNAUTHENTICATED');
  });

  test('valid token connects and joins the personal room user:<id>', async () => {
    const { token, id } = await createUser();
    const socket = await connectClient(srv.url, token);
    const received = waitFor(socket, 'ping:test');
    emitToUser(id, 'ping:test', { ok: true });
    await expect(received).resolves.toEqual({ ok: true });
    socket.close();
  });
});
