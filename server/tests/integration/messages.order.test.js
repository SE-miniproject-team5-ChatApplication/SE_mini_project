const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('REQ-MSG-5 ordering by server timestamp, send order preserved', () => {
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

  test('TC-MSG-03 20 messages sent quickly are stored and received in order 1..20', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);

    const received = [];
    const all = new Promise((resolve) => {
      sb.on('message:new', (m) => {
        received.push(m.content);
        if (received.length === 20) resolve();
      });
    });
    const numbers = Array.from({ length: 20 }, (_, i) => String(i + 1));
    await Promise.all(numbers.map((n) => emitAck(sa, 'message:send', { conversationId, content: n })));
    await all;

    const stored = await Message.find({ conversationId }).sort({ sentAt: 1, _id: 1 });
    expect(stored.map((m) => m.content)).toEqual(numbers);
    expect(received).toEqual(numbers);
  });
});
