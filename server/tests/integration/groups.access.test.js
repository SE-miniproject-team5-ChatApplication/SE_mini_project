const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createGroupWith } = require('../helpers/group');
const { Message } = require('../../src/models');
const groupService = require('../../src/services/groupService');

describeDb('REQ-GRP-5 / NFR-SEC-4 non-members cannot read or send', () => {
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

  test('TC-GRP-05 a removed member gets 403 for message:send and for history; nothing is stored', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const removed = members[1];
    const sRemoved = await connectClient(srv.url, removed.token);
    const sAdmin = await connectClient(srv.url, admin.token);
    sockets.push(sRemoved, sAdmin);

    await groupService.removeMember(admin.id, groupId, removed.id);

    const ack = await emitAck(sRemoved, 'message:send', { conversationId: groupId, content: 'still here?' });
    expect(ack.ok).toBe(false);
    expect(ack.error.code).toBe('FORBIDDEN');
    // Only the "... removed ..." system message (REQ-GRP-6) may exist - nothing from the removed user.
    expect(await Message.countDocuments({ conversationId: groupId, senderId: removed.id })).toBe(0);

    const history = await request(srv.app)
      .get(`/api/conversations/${groupId}/messages`)
      .set('Authorization', `Bearer ${removed.token}`);
    expect(history.status).toBe(403);
  });

  test('a removed member no longer receives new group messages', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const removed = members[1];
    const sRemoved = await connectClient(srv.url, removed.token);
    const sAdmin = await connectClient(srv.url, admin.token);
    sockets.push(sRemoved, sAdmin);
    await groupService.removeMember(admin.id, groupId, removed.id);

    let leaked = false;
    sRemoved.on('message:new', () => {
      leaked = true;
    });
    await emitAck(sAdmin, 'message:send', { conversationId: groupId, content: 'secret plan' });
    await new Promise((r) => setTimeout(r, 200));
    expect(leaked).toBe(false);
  });
});
