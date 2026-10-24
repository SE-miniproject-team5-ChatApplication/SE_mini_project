const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck, waitFor } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('REQ-MSG-4 invalid messages get an error event', () => {
  let srv;
  let socket;
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    if (socket) socket.close();
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-MSG-02 empty and 2001-char messages rejected, 2000-char accepted', async () => {
    const { a, conversationId } = await createDirectChat();
    socket = await connectClient(srv.url, a.token);

    const errorEvent = waitFor(socket, 'error:event');
    const empty = await emitAck(socket, 'message:send', { conversationId, content: '' });
    expect(empty.ok).toBe(false);
    expect((await errorEvent).code).toBe('VALIDATION_ERROR');

    const tooLong = await emitAck(socket, 'message:send', { conversationId, content: 'x'.repeat(2001) });
    expect(tooLong.ok).toBe(false);

    const max = await emitAck(socket, 'message:send', { conversationId, content: 'x'.repeat(2000) });
    expect(max.ok).toBe(true);
    expect(await Message.countDocuments()).toBe(1);
  });
});
