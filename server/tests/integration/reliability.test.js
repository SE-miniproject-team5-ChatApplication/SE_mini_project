const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { eventually } = require('../helpers/wait');
const { Message } = require('../../src/models');
const { io: ioClient } = require('socket.io-client');

function collector(url, token, received) {
  return new Promise((resolve, reject) => {
    const s = ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    s.on('message:new', (m) => {
      received.push(m.id);
      s.emit('message:delivered', { messageId: m.id });
    });
    s.once('session:ready', () => resolve(s));
    s.once('connect_error', reject);
  });
}

describeDb('NFR-QA-2 no acknowledged message is lost', () => {
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

  test('TC-MSG-05 recipient drops mid-conversation; every acked message arrives exactly once', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    sockets.push(sa);
    const received = [];
    let sb = await collector(srv.url, b.token, received);

    const acked = [];
    for (let i = 0; i < 10; i += 1) {
      if (i === 4) sb.close(); // network drop
      if (i === 8) {
        sb = await collector(srv.url, b.token, received); // back online
        sockets.push(sb);
      }
      const ack = await emitAck(sa, 'message:send', { conversationId, content: `m${i}`, clientMsgId: `qa2-${i}` });
      expect(ack.ok).toBe(true);
      acked.push(ack.messageId);
    }

    await eventually(() => new Set(received).size === 10, 3000);
    expect(new Set(received)).toEqual(new Set(acked));
    expect(await Message.countDocuments({ conversationId })).toBe(10);
  });
});
