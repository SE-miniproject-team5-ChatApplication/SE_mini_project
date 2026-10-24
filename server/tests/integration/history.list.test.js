const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { Contact } = require('../../src/models');
const { getOrCreateDirect } = require('../../src/services/conversationService');
const { createMessage } = require('../../src/services/messageService');

describeDb('REQ-HIS-1 conversation list', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-HIS-01 ordered by latest activity with preview and time', async () => {
    const me = await createUser({ username: 'raksha' });
    const b = await createUser({ username: 'omkar', displayName: 'Omkar' });
    const c = await createUser({ username: 'prachi', displayName: 'Prachi' });
    await Contact.create([
      { userId: me.id, contactUserId: b.id },
      { userId: me.id, contactUserId: c.id },
    ]);
    const withB = await getOrCreateDirect(me.id, b.id);
    const withC = await getOrCreateDirect(me.id, c.id);
    await createMessage({ conversationId: withB.id, senderId: b.id, content: 'older' });
    await new Promise((r) => setTimeout(r, 5));
    await createMessage({ conversationId: withC.id, senderId: c.id, content: 'newest' });

    const res = await request(app).get('/api/conversations').set('Authorization', `Bearer ${me.token}`);
    expect(res.status).toBe(200);
    expect(res.body.map((x) => x.name)).toEqual(['Prachi', 'Omkar']);
    expect(res.body[0].lastMessage.preview).toBe('newest');
    expect(res.body[0].lastMessage.sentAt).toBeDefined();
    expect(res.body[0].otherUser.username).toBe('prachi');
  });

  test('a user only sees their own conversations', async () => {
    const outsider = await createUser();
    const res = await request(app).get('/api/conversations').set('Authorization', `Bearer ${outsider.token}`);
    expect(res.body).toEqual([]);
  });
});
