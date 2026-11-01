const fs = require('fs');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { User, Contact, Member, Message } = require('../../src/models');
const { hashPassword } = require('../../src/services/authService');
const { createMessage } = require('../../src/services/messageService');
const { saveBuffer, resolveStoragePath } = require('../../src/services/fileStorage');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { createGroupWith } = require('../helpers/group');

const PASSWORD = 'secret123';
const ALLOWED_FIELDS = [
  '_id', '__v', 'username', 'email', 'passwordHash', 'displayName', 'statusMessage', 'avatarPath',
  'lastSeen', 'lastLoginAt', 'failedLoginCount', 'lockUntil', 'createdAt', 'updatedAt',
];

describeDb('NFR-SEC-7 data minimisation and account deletion', () => {
  const app = createApp();
  const auth = (req, who) => req.set('Authorization', `Bearer ${who.token}`);
  const del = (who, body) => auth(request(app).delete('/api/users/me'), who).send(body);
  const withPassword = async (who) => {
    await User.updateOne({ _id: who.id }, { passwordHash: await hashPassword(PASSWORD) });
    return who;
  };

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-SEC-07 registration stores only the minimum personal data', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice_1', email: 'alice@test.com', password: PASSWORD,
      phone: '9999999999', address: 'Bangalore', role: 'admin',
    });
    expect(res.status).toBe(201);
    const raw = await User.collection.findOne({ username: 'alice_1' });
    Object.keys(raw).forEach((key) => expect(ALLOWED_FIELDS).toContain(key));
  });

  test("TC-SEC-07 other users never see someone's email", async () => {
    const me = await createUser({ username: 'alice_1' });
    await createUser({ username: 'alicia_2' });
    const res = await auth(request(app).get('/api/users/search?q=alicia'), me);
    expect(res.status).toBe(200);
    expect(res.body[0].email).toBeUndefined();
  });

  test('TC-SEC-07 deleting needs the correct password', async () => {
    const me = await createUser({ password: PASSWORD });
    expect((await del(me, {})).status).toBe(400);
    expect((await del(me, { password: 'wrongpass1' })).status).toBe(403);
    expect(await User.exists({ _id: me.id })).toBeTruthy();
  });

  test('TC-SEC-07 deleting removes the account, contacts both ways and the token', async () => {
    const { a, b } = await createDirectChat();
    await withPassword(a);
    expect((await del(a, { password: PASSWORD })).status).toBe(204);

    expect(await User.exists({ _id: a.id })).toBeNull();
    expect(await Contact.countDocuments({ $or: [{ userId: a.id }, { contactUserId: a.id }] })).toBe(0);
    expect(await Member.countDocuments({ userId: a.id })).toBe(0);
    expect((await auth(request(app).get('/api/users/me'), a)).status).toBe(401);
    expect(await User.exists({ _id: b.id })).toBeTruthy();
  });

  test('TC-SEC-07 the other person keeps the chat history, shown as "Deleted user"', async () => {
    const { a, b, conversationId } = await createDirectChat();
    await withPassword(a);
    await createMessage({ conversationId, senderId: a.id, content: 'hello before I go' });
    await del(a, { password: PASSWORD });

    const list = await auth(request(app).get('/api/conversations'), b);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Deleted user');
    expect(await Message.countDocuments({ conversationId })).toBe(1);
  });

  test('TC-SEC-07 a deleted group admin hands admin over to the next member', async () => {
    const { admin, members, groupId } = await createGroupWith(3);
    await withPassword(admin);
    expect((await del(admin, { password: PASSWORD })).status).toBe(204);
    expect(await Member.exists({ conversationId: groupId, userId: admin.id })).toBeNull();
    const first = await Member.findOne({ conversationId: groupId, userId: members[0].id });
    expect(first.role).toBe('admin');
  });

  test('TC-SEC-07 the avatar file is deleted with the account', async () => {
    const me = await createUser({ password: PASSWORD });
    const avatarPath = await saveBuffer(Buffer.from('fake image'), '.png', 'avatars');
    await User.updateOne({ _id: me.id }, { avatarPath });
    await del(me, { password: PASSWORD });
    expect(fs.existsSync(resolveStoragePath(avatarPath))).toBe(false);
  });
});
