const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('REQ-MSG-1 send a text message to a contact', () => {
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

  test('BR-2 a direct conversation can only be started with a contact', async () => {
    const a = await createUser();
    const b = await createUser();
    const res = await request(srv.app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ userId: b.id });
    expect(res.status).toBe(403);
  });

  test('TC-MSG-01 sender gets an ack with the stored message id', async () => {
    const { a, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    sockets.push(sa);
    const ack = await emitAck(sa, 'message:send', { conversationId, content: 'Hello', clientMsgId: 'c-1' });
    expect(ack.ok).toBe(true);
    expect(ack.status).toBe('sent');
    const stored = await Message.findById(ack.messageId);
    expect(stored.content).toBe('Hello');
    expect(String(stored.senderId)).toBe(a.id);
  });

  test('a user who is not a member cannot send into the conversation', async () => {
    const { conversationId } = await createDirectChat();
    const outsider = await createUser();
    const so = await connectClient(srv.url, outsider.token);
    sockets.push(so);
    const ack = await emitAck(so, 'message:send', { conversationId, content: 'hi' });
    expect(ack.ok).toBe(false);
    expect(ack.error.code).toBe('FORBIDDEN');
    expect(await Message.countDocuments()).toBe(0);
  });
});
