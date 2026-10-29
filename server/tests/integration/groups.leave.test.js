const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { createGroupWith } = require('../helpers/group');
const { Member } = require('../../src/models');

describeDb('REQ-GRP-4 leave group and admin succession', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  const leave = (user, groupId) => request(app).post(`/api/groups/${groupId}/leave`).set('Authorization', `Bearer ${user.token}`);

  test('TC-GRP-04 when the last admin leaves, the earliest-joined member becomes admin', async () => {
    const { admin, members, groupId } = await createGroupWith(3);
    expect((await leave(admin, groupId)).status).toBe(204);
    expect(await Member.exists({ conversationId: groupId, userId: admin.id })).toBeNull();
    const first = await Member.findOne({ conversationId: groupId, userId: members[0].id });
    expect(first.role).toBe('admin');
    const others = await Member.find({ conversationId: groupId, role: 'admin' });
    expect(others).toHaveLength(1);
  });

  test('a member leaving does not change admins; a non-member gets 403', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    expect((await leave(members[1], groupId)).status).toBe(204);
    expect((await Member.findOne({ conversationId: groupId, userId: admin.id })).role).toBe('admin');
    const outsider = await createUser();
    expect((await leave(outsider, groupId)).status).toBe(403);
  });
});
