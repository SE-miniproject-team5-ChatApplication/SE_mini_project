const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { createGroupWith } = require('../helpers/group');
const { Contact, Member, Conversation } = require('../../src/models');

describeDb('REQ-GRP-2 admin-only group management', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  const as = (user) => ({
    post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${user.token}`).send(body),
    put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${user.token}`).send(body),
    del: (url) => request(app).delete(url).set('Authorization', `Bearer ${user.token}`),
  });

  test('TC-GRP-02 admin adds, removes, renames and promotes', async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const newbie = await createUser();
    await Contact.create({ userId: admin.id, contactUserId: newbie.id });

    expect((await as(admin).post(`/api/groups/${groupId}/members`, { userId: newbie.id })).status).toBe(200);
    expect((await as(admin).del(`/api/groups/${groupId}/members/${newbie.id}`)).status).toBe(200);
    expect((await as(admin).put(`/api/groups/${groupId}`, { name: 'Renamed' })).status).toBe(200);
    expect((await Conversation.findById(groupId)).name).toBe('Renamed');
    expect((await as(admin).post(`/api/groups/${groupId}/admins`, { userId: members[0].id })).status).toBe(200);
    expect((await Member.findOne({ conversationId: groupId, userId: members[0].id })).role).toBe('admin');
  });

  test("TC-GRP-02 a normal member's attempts return 403", async () => {
    const { admin, members, groupId } = await createGroupWith(2);
    const member = members[1];
    const other = await createUser();
    expect((await as(member).post(`/api/groups/${groupId}/members`, { userId: other.id })).status).toBe(403);
    expect((await as(member).del(`/api/groups/${groupId}/members/${admin.id}`)).status).toBe(403);
    expect((await as(member).put(`/api/groups/${groupId}`, { name: 'Hacked' })).status).toBe(403);
    expect((await as(member).post(`/api/groups/${groupId}/admins`, { userId: member.id })).status).toBe(403);
  });
});
