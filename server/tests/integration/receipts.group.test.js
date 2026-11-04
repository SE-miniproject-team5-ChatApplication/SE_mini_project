const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, waitForMatch } = require('../helpers/socket');
const { createGroupWith } = require('../helpers/group');
const { createUser } = require('../helpers/factory');
const { createMessage } = require('../../src/services/messageService');
const { markRead } = require('../../src/services/receiptService');
const { createGroup, leaveGroup, removeMember } = require('../../src/services/groupService');
const { deleteAccount } = require('../../src/services/userService');
const { Contact, Message } = require('../../src/models');

describeDb('REQ-RCP-5 group read receipts', () => {
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

  const statusOf = async (msg) => (await Message.findById(msg._id)).status;
  const receipts = (user, msg) =>
    request(srv.app).get(`/api/messages/${msg._id}/receipts`).set('Authorization', `Bearer ${user.token}`);

  test('TC-RCP-02 not read until all members read it; sender sees per-member status', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const msg = await createMessage({ conversationId: groupId, senderId: admin.id, content: 'did everyone see this?' });

    await markRead(members[0].id, { conversationId: groupId });
    expect(await statusOf(msg)).not.toBe('read');

    const res = await receipts(admin, msg);
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.members.map((m) => [m.userId, m.status]));
    expect(byId[members[0].id]).toBe('read');
    expect(byId[members[1].id]).toBe('sent');

    await markRead(members[1].id, { conversationId: groupId });
    expect(await statusOf(msg)).toBe('read');

    const other = await receipts(members[0], msg);
    expect(other.status).toBe(403);
  });

  test('TC-RCP-02 read once every current member has read it, after a member who had not read it leaves', async () => {
    const { admin, members, groupId } = await createGroupWith(3);
    const msg = await createMessage({ conversationId: groupId, senderId: admin.id, content: 'plan for friday' });
    await markRead(members[0].id, { conversationId: groupId });

    await leaveGroup(members[1].id, groupId);
    expect(await statusOf(msg)).not.toBe('read'); // members[2] has not read it yet

    await markRead(members[2].id, { conversationId: groupId });
    expect(await statusOf(msg)).toBe('read');
    const res = await receipts(admin, msg);
    expect(res.body.members.map((m) => m.userId).sort()).toEqual([members[0].id, members[2].id].sort());
  });

  test('TC-RCP-02 an admin removing the last member who had not read it makes the message read', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const msg = await createMessage({ conversationId: groupId, senderId: admin.id, content: 'removing someone' });
    await markRead(members[0].id, { conversationId: groupId });

    await removeMember(admin.id, groupId, members[1].id);
    expect(await statusOf(msg)).toBe('read');
  });

  test('TC-RCP-02 deleting the account of the last member who had not read it makes the message read', async () => {
    const admin = await createUser();
    const reader = await createUser();
    const leaver = await createUser({ password: 'Chat1234' });
    await Contact.create([reader, leaver].map((m) => ({ userId: admin.id, contactUserId: m.id })));
    const group = await createGroup(admin.id, { name: 'Team 5', memberIds: [reader.id, leaver.id] });
    const msg = await createMessage({ conversationId: group.id, senderId: admin.id, content: 'see you all' });
    await markRead(reader.id, { conversationId: group.id });

    await deleteAccount(leaver.id, { password: 'Chat1234' });
    expect(await statusOf(msg)).toBe('read');
  });

  test('TC-RCP-02 the sender is told at once when a member leaving makes the message read', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const msg = await createMessage({ conversationId: groupId, senderId: admin.id, content: 'live update' });
    await markRead(members[0].id, { conversationId: groupId });
    const socket = await connectClient(srv.url, admin.token);
    sockets.push(socket);

    const update = waitForMatch(socket, 'receipt:update', (u) => u.messageId === String(msg._id));
    await leaveGroup(members[1].id, groupId);
    expect(await update).toMatchObject({ conversationId: groupId, status: 'read', userId: members[1].id });
  });
});
