
const {
  describeDb,
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');

const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { createGroupWith } = require('../helpers/group');
const { eventually } = require('../helpers/wait');
const { Member } = require('../../src/models');

describeDb('REQ-NOT-1 unread message counts', () => {
  let srv;
  const sockets = [];

  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });

  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.close());
    await clearTestDb();
  });

  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('recipient unread count increases while sender count stays zero', async () => {
    const { a, b, conversationId } = await createDirectChat();

    const senderSocket = await connectClient(srv.url, a.token);
    const recipientSocket = await connectClient(srv.url, b.token);
    sockets.push(senderSocket, recipientSocket);

    const ack = await emitAck(senderSocket, 'message:send', {
      conversationId,
      content: 'Hello',
      clientMsgId: 'unread-test-1',
    });

    expect(ack.ok).toBe(true);

    await eventually(async () => {
      const recipient = await Member.findOne({
        conversationId,
        userId: b.id,
      });
      return recipient && recipient.unreadCount === 1;
    });

    const sender = await Member.findOne({
      conversationId,
      userId: a.id,
    });

    const recipient = await Member.findOne({
      conversationId,
      userId: b.id,
    });

    expect(sender.unreadCount).toBe(0);
    expect(recipient.unreadCount).toBe(1);
  });

  test('resending the same message does not increment unread count twice', async () => {
    const { a, b, conversationId } = await createDirectChat();

    const senderSocket = await connectClient(srv.url, a.token);
    sockets.push(senderSocket);

    const payload = {
      conversationId,
      content: 'Duplicate test',
      clientMsgId: 'unread-duplicate-1',
    };

    const first = await emitAck(senderSocket, 'message:send', payload);
    const second = await emitAck(senderSocket, 'message:send', payload);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.messageId).toBe(first.messageId);

    await eventually(async () => {
      const recipient = await Member.findOne({
        conversationId,
        userId: b.id,
      });
      return recipient && recipient.unreadCount === 1;
    });

    const recipient = await Member.findOne({
      conversationId,
      userId: b.id,
    });

    expect(recipient.unreadCount).toBe(1);
  });

  test('opening a conversation resets unread count and updates lastReadAt', async () => {
    const { a, b, conversationId } = await createDirectChat();

    const senderSocket = await connectClient(srv.url, a.token);
    const recipientSocket = await connectClient(srv.url, b.token);
    sockets.push(senderSocket, recipientSocket);

    const ack = await emitAck(senderSocket, 'message:send', {
      conversationId,
      content: 'Please read this',
      clientMsgId: 'unread-reset-1',
    });

    expect(ack.ok).toBe(true);

    await eventually(async () => {
      const member = await Member.findOne({
        conversationId,
        userId: b.id,
      });
      return member && member.unreadCount === 1;
    });

    recipientSocket.emit('message:read', { conversationId });

    await eventually(async () => {
      const member = await Member.findOne({
        conversationId,
        userId: b.id,
      });
      return member && member.unreadCount === 0 && member.lastReadAt;
    });

    const recipient = await Member.findOne({
      conversationId,
      userId: b.id,
    });

    expect(recipient.unreadCount).toBe(0);
    expect(recipient.lastReadAt).toBeInstanceOf(Date);
  });

  test('group message increments unread counts for every other member', async () => {
    const { admin, members, groupId } = await createGroupWith(2);

    const adminSocket = await connectClient(srv.url, admin.token);
    sockets.push(adminSocket);

    const ack = await emitAck(adminSocket, 'message:send', {
      conversationId: groupId,
      content: 'Group announcement',
      clientMsgId: 'unread-group-1',
    });

    expect(ack.ok).toBe(true);

    for (const member of members) {
      await eventually(async () => {
        const record = await Member.findOne({
          conversationId: groupId,
          userId: member.id,
        });
        return record && record.unreadCount === 1;
      });

      const record = await Member.findOne({
        conversationId: groupId,
        userId: member.id,
      });

      expect(record.unreadCount).toBe(1);
    }

    const adminRecord = await Member.findOne({
      conversationId: groupId,
      userId: admin.id,
    });

    expect(adminRecord.unreadCount).toBe(0);
  });
});
