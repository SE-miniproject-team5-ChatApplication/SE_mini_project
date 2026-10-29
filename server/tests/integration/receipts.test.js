const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck, waitFor } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

// Polls the database until the predicate is true (receipts are fire-and-forget events).
async function eventually(check, timeoutMs = 2000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return;
    if (Date.now() > end) throw new Error('condition not met in time');
    await new Promise((r) => setTimeout(r, 25));
  }
}

describeDb('REQ-RCP-2 delivered when the recipient acknowledges', () => {
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

  test('TC-RCP-01 status becomes delivered after B acknowledges; the sender cannot fake it', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);
    const got = waitFor(sb, 'message:new');
    const ack = await emitAck(sa, 'message:send', { conversationId, content: 'hi' });
    await got;

    sa.emit('message:delivered', { messageId: ack.messageId }); // ignored: A is the sender
    sb.emit('message:delivered', { messageId: ack.messageId });
    await eventually(async () => (await Message.findById(ack.messageId)).status === 'delivered');
    const stored = await Message.findById(ack.messageId);
    expect(stored.deliveredTo.map((d) => String(d.userId))).toEqual([b.id]);
  });
});

module.exports = { eventually };
