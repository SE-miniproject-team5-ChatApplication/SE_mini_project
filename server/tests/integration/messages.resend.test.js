const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('REQ-MSG-7 resend after reconnect without duplicates', () => {
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

  test('TC-MSG-05 the same clientMsgId sent again (after a reconnect) is stored once', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sb);
    const received = [];
    sb.on('message:new', (m) => received.push(m.id));

    const first = await connectClient(srv.url, a.token);
    const ack1 = await emitAck(first, 'message:send', { conversationId, content: 'hello', clientMsgId: 'retry-1' });
    first.close(); // connection lost before the client saw the ack...

    const second = await connectClient(srv.url, a.token); // ...so it reconnects and resends
    sockets.push(second);
    const ack2 = await emitAck(second, 'message:send', { conversationId, content: 'hello', clientMsgId: 'retry-1' });

    expect(ack2.ok).toBe(true);
    expect(ack2.messageId).toBe(ack1.messageId);
    expect(await Message.countDocuments({ conversationId })).toBe(1);
    await new Promise((r) => setTimeout(r, 150));
    expect(received).toEqual([ack1.messageId]);
  });

  test('two copies arriving at the same time still create one message', async () => {
    const { a, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sa2 = await connectClient(srv.url, a.token);
    sockets.push(sa, sa2);
    const [x, y] = await Promise.all([
      emitAck(sa, 'message:send', { conversationId, content: 'once', clientMsgId: 'race-1' }),
      emitAck(sa2, 'message:send', { conversationId, content: 'once', clientMsgId: 'race-1' }),
    ]);
    expect(x.messageId).toBe(y.messageId);
    expect(await Message.countDocuments({ conversationId })).toBe(1);
  });
});
