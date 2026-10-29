const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck, waitFor } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('REQ-MSG-8 delete own message', () => {
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

  test('TC-MSG-06 A deletes own message; B sees it deleted; B cannot delete A\'s message (403)', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);
    const ack = await emitAck(sa, 'message:send', { conversationId, content: 'oops' });

    const byB = await emitAck(sb, 'message:delete', { messageId: ack.messageId });
    expect(byB.ok).toBe(false);
    expect(byB.error.code).toBe('FORBIDDEN');

    const seen = waitFor(sb, 'message:deleted');
    const byA = await emitAck(sa, 'message:delete', { messageId: ack.messageId });
    expect(byA.ok).toBe(true);
    expect((await seen).messageId).toBe(ack.messageId);

    // BR-4: the record stays (audit) but the content is hidden from everyone.
    const stored = await Message.findById(ack.messageId);
    expect(stored.status).toBe('deleted');
    expect(stored.content).toBe('oops');
    const history = await request(srv.app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${b.token}`);
    expect(history.body.messages[0].content).toBeNull();
    const list = await request(srv.app).get('/api/conversations').set('Authorization', `Bearer ${b.token}`);
    expect(list.body[0].lastMessage.preview).toBe('This message was deleted');
  });
});
