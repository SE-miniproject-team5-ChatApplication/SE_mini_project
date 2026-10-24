const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('REQ-MSG-3 persist every message before acknowledging it', () => {
  let srv;
  let socket;
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    if (socket) socket.close();
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-MSG-01 the message is already in the database when the ack arrives', async () => {
    const { a, conversationId } = await createDirectChat();
    socket = await connectClient(srv.url, a.token);
    const ack = await emitAck(socket, 'message:send', { conversationId, content: 'stored first' });
    expect(await Message.exists({ _id: ack.messageId })).toBeTruthy();
  });

  test('TC-SAFE-01 if the database write fails the sender gets an error, not an ack', async () => {
    const { a, conversationId } = await createDirectChat();
    socket = await connectClient(srv.url, a.token);
    jest.spyOn(Message, 'create').mockRejectedValueOnce(new Error('disk full'));
    const ack = await emitAck(socket, 'message:send', { conversationId, content: 'will fail', clientMsgId: 'x1' });
    expect(ack.ok).toBe(false);
    expect(ack.error.code).toBe('INTERNAL_ERROR');
    expect(ack.error.message).not.toMatch(/disk full/);
    expect(await Message.countDocuments()).toBe(0);
  });
});
