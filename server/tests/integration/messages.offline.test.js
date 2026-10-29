const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { eventually } = require('../helpers/wait');
const { Message } = require('../../src/models');
const { io: ioClient } = require('socket.io-client');

// Connects and collects message:new events from the very first moment.
function connectCollecting(url, token, received) {
  return new Promise((resolve, reject) => {
    const s = ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    s.on('message:new', (m) => {
      received.push(m);
      s.emit('message:delivered', { messageId: m.id });
    });
    s.once('session:ready', () => resolve(s));
    s.once('connect_error', reject);
  });
}

describeDb('REQ-MSG-6 offline recipients get stored messages on reconnect', () => {
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

  test('TC-MSG-04 B receives all 3 exactly once, in order, then they are delivered', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    sockets.push(sa);
    for (const text of ['one', 'two', 'three']) await emitAck(sa, 'message:send', { conversationId, content: text });

    const received = [];
    const sb = await connectCollecting(srv.url, b.token, received);
    sockets.push(sb);
    await eventually(() => received.length === 3);
    expect(received.map((m) => m.content)).toEqual(['one', 'two', 'three']);
    await eventually(async () => (await Message.countDocuments({ conversationId, status: 'delivered' })) === 3);

    // Reconnecting again does not send them a second time.
    sb.close();
    const again = [];
    const sb2 = await connectCollecting(srv.url, b.token, again);
    sockets.push(sb2);
    await new Promise((r) => setTimeout(r, 200));
    expect(again).toEqual([]);
  });
});
