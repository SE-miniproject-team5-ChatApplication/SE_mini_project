const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck, waitFor } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');
const { eventually } = require('../helpers/wait');

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


describeDb('REQ-RCP-3 read when the conversation is open and the message displayed', () => {
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

  test('TC-RCP-01 opening the conversation marks earlier messages read', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);
    const first = await emitAck(sa, 'message:send', { conversationId, content: 'one' });
    const second = await emitAck(sa, 'message:send', { conversationId, content: 'two' });

    sb.emit('message:read', { conversationId });
    await eventually(async () => (await Message.countDocuments({ conversationId, status: 'read' })) === 2);
    for (const id of [first.messageId, second.messageId]) {
      const m = await Message.findById(id);
      expect(m.readBy.map((r) => String(r.userId))).toEqual([b.id]);
    }
  });

  test('TC-RCP-01 a late "delivered" after "read" does not move the status back', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);
    const ack = await emitAck(sa, 'message:send', { conversationId, content: 'x' });
    sb.emit('message:read', { messageId: ack.messageId });
    await eventually(async () => (await Message.findById(ack.messageId)).status === 'read');
    sb.emit('message:delivered', { messageId: ack.messageId });
    await new Promise((r) => setTimeout(r, 150));
    expect((await Message.findById(ack.messageId)).status).toBe('read');
  });

  test('a non-member cannot mark messages read', async () => {
    const { a, conversationId } = await createDirectChat();
    const { createUser } = require('../helpers/factory');
    const outsider = await createUser();
    const sa = await connectClient(srv.url, a.token);
    const so = await connectClient(srv.url, outsider.token);
    sockets.push(sa, so);
    const ack = await emitAck(sa, 'message:send', { conversationId, content: 'x' });
    so.emit('message:read', { conversationId });
    so.emit('message:read', { messageId: ack.messageId });
    await new Promise((r) => setTimeout(r, 150));
    expect((await Message.findById(ack.messageId)).status).toBe('sent');
  });
});
