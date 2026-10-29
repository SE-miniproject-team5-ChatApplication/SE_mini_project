const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, waitFor } = require('../helpers/socket');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');

describeDb('REQ-PRS-3 typing indicator', () => {
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

  test('TC-PRS-02 B sees A typing within 300 ms, then stop', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);

    const started = Date.now();
    const on = waitFor(sb, 'typing:update');
    sa.emit('typing:start', { conversationId });
    expect(await on).toEqual({ conversationId, userId: a.id, typing: true });
    expect(Date.now() - started).toBeLessThan(300);

    const off = waitFor(sb, 'typing:update');
    sa.emit('typing:stop', { conversationId });
    expect((await off).typing).toBe(false);
  });

  test('a non-member cannot send typing events into the conversation', async () => {
    const { b, conversationId } = await createDirectChat();
    const outsider = await createUser();
    const sb = await connectClient(srv.url, b.token);
    const so = await connectClient(srv.url, outsider.token);
    sockets.push(sb, so);
    let got = false;
    sb.on('typing:update', () => {
      got = true;
    });
    so.emit('typing:start', { conversationId });
    await new Promise((r) => setTimeout(r, 200));
    expect(got).toBe(false);
  });
});
