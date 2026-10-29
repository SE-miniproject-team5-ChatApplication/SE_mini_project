const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck, waitFor } = require('../helpers/socket');
const { createGroupWith } = require('../helpers/group');
const { eventually } = require('../helpers/wait');
const { io: ioClient } = require('socket.io-client');

describeDb('REQ-GRP-3 group messages reach all members', () => {
  let srv;
  const sockets = [];
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

  test('TC-GRP-03 online members get it at once; the offline member gets it on next login', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const [online, offline] = members;
    const sAdmin = await connectClient(srv.url, admin.token);
    const sOnline = await connectClient(srv.url, online.token);
    sockets.push(sAdmin, sOnline);

    const got = waitFor(sOnline, 'message:new');
    const ack = await emitAck(sAdmin, 'message:send', { conversationId: groupId, content: 'Meeting at 5' });
    expect(ack.ok).toBe(true);
    expect((await got).content).toBe('Meeting at 5');

    const later = [];
    const sOffline = await new Promise((resolve) => {
      const s = ioClient(srv.url, { auth: { token: offline.token }, transports: ['websocket'], forceNew: true, reconnection: false });
      s.on('message:new', (m) => later.push(m));
      s.once('session:ready', () => resolve(s));
    });
    sockets.push(sOffline);
    await eventually(() => later.length === 1);
    expect(later[0].content).toBe('Meeting at 5');
  });
});
