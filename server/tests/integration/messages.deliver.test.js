const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck, waitFor } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');

describeDb('REQ-MSG-2 real-time delivery to online recipients', () => {
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

  test('TC-MSG-01 B receives "Hello" from A within 500 ms', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);

    const started = Date.now();
    const received = waitFor(sb, 'message:new');
    await emitAck(sa, 'message:send', { conversationId, content: 'Hello' });
    const msg = await received;
    expect(Date.now() - started).toBeLessThan(500);
    expect(msg.content).toBe('Hello');
    expect(msg.senderId).toBe(a.id);
    expect(msg.conversationId).toBe(conversationId);
  });

  test('every open tab of the recipient gets the message', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb1 = await connectClient(srv.url, b.token);
    const sb2 = await connectClient(srv.url, b.token);
    sockets.push(sa, sb1, sb2);
    const both = Promise.all([waitFor(sb1, 'message:new'), waitFor(sb2, 'message:new')]);
    await emitAck(sa, 'message:send', { conversationId, content: 'to both tabs' });
    const [m1, m2] = await both;
    expect(m1.id).toBe(m2.id);
  });
});
