const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, waitFor } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const presenceService = require('../../src/services/presenceService');

describeDb('REQ-PRS-1 online/offline broadcast to contacts', () => {
  let srv;
  const sockets = [];
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    sockets.splice(0).forEach((s) => s.close());
    presenceService.reset();
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-PRS-01 A sees B online when B connects and offline when B disconnects', async () => {
    const { a, b } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    sockets.push(sa);

    const online = waitFor(sa, 'presence:update', 2000);
    const sb = await connectClient(srv.url, b.token);
    expect(await online).toMatchObject({ userId: b.id, status: 'online' });

    const offline = waitFor(sa, 'presence:update', 2000);
    sb.close();
    expect(await offline).toMatchObject({ userId: b.id, status: 'offline' });
  });
});
