const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { Contact, Member } = require('../../src/models');

describeDb('REQ-GRP-1 create a group', () => {
  const app = createApp();
  let me;
  let friends;
  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser();
    friends = [await createUser(), await createUser(), await createUser()];
    await Contact.create(friends.map((f) => ({ userId: me.id, contactUserId: f.id })));
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  const create = (body) => request(app).post('/api/groups').set('Authorization', `Bearer ${me.token}`).send(body);

  test('TC-GRP-01 51-character name is rejected', async () => {
    const res = await create({ name: 'x'.repeat(51), memberIds: friends.map((f) => f.id) });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('name');
  });

  test('TC-GRP-01 only one other member is rejected', async () => {
    expect((await create({ name: 'Duo', memberIds: [friends[0].id] })).status).toBe(400);
  });

  test('TC-GRP-01 three valid members creates the group with the creator as admin', async () => {
    const res = await create({ name: 'SE Team', memberIds: friends.map((f) => f.id) });
    expect(res.status).toBe(201);
    expect(res.body.members).toHaveLength(4);
    const admin = await Member.findOne({ conversationId: res.body.groupId, userId: me.id });
    expect(admin.role).toBe('admin');
  });

  test('TC-GRP-01 more than 100 members is rejected', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => (i + 1).toString(16).padStart(24, '0'));
    expect((await create({ name: 'Huge', memberIds: ids })).status).toBe(400);
  });

  test('members must be contacts (404 otherwise)', async () => {
    const stranger = await createUser();
    expect((await create({ name: 'G', memberIds: [friends[0].id, stranger.id] })).status).toBe(404);
  });
});
