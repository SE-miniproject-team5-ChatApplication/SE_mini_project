
const request = require('supertest');
const {
  describeDb,
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { Contact } = require('../../src/models');
const { getOrCreateDirect } = require('../../src/services/conversationService');
const { createMessage } = require('../../src/services/messageService');

describeDb('Conversation history', () => {
  const app = createApp();

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-HIS-01 orders conversations by latest activity with preview and time', async () => {
    const me = await createUser({ username: 'raksha' });
    const b = await createUser({
      username: 'omkar',
      displayName: 'Omkar',
    });
    const c = await createUser({
      username: 'prachi',
      displayName: 'Prachi',
    });

    await Contact.create([
      { userId: me.id, contactUserId: b.id },
      { userId: me.id, contactUserId: c.id },
    ]);

    const withB = await getOrCreateDirect(me.id, b.id);
    const withC = await getOrCreateDirect(me.id, c.id);

    await createMessage({
      conversationId: withB.id,
      senderId: b.id,
      content: 'older',
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    await createMessage({
      conversationId: withC.id,
      senderId: c.id,
      content: 'newest',
    });

    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(200);
    expect(res.body.map((item) => item.name)).toEqual([
      'Prachi',
      'Omkar',
    ]);
    expect(res.body[0].lastMessage.preview).toBe('newest');
    expect(res.body[0].lastMessage.sentAt).toBeDefined();
    expect(res.body[0].otherUser.username).toBe('prachi');
  });

  test('a user only sees their own conversations', async () => {
    const outsider = await createUser();

    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('TC-HIS-02 loads the latest 50 messages first', async () => {
    const me = await createUser({ username: 'history_me' });
    const other = await createUser({ username: 'history_other' });

    await Contact.create([
      { userId: me.id, contactUserId: other.id },
    ]);

    const conversation = await getOrCreateDirect(me.id, other.id);

    for (let i = 1; i <= 120; i += 1) {
      await createMessage({
        conversationId: conversation.id,
        senderId: other.id,
        content: `message-${i}`,
      });
    }

    const res = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${me.token}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(50);
    expect(res.body.messages[0].content).toBe('message-71');
    expect(res.body.messages[49].content).toBe('message-120');
    expect(res.body.hasMore).toBe(true);
    expect(res.body.nextBefore).toBeTruthy();
  });

  test('TC-HIS-03 loads older messages in pages of 50, then 20', async () => {
    const me = await createUser({ username: 'history_page_me' });
    const other = await createUser({ username: 'history_page_other' });

    await Contact.create([
      { userId: me.id, contactUserId: other.id },
    ]);

    const conversation = await getOrCreateDirect(me.id, other.id);
    const url = `/api/conversations/${conversation.id}/messages`;
    const auth = `Bearer ${me.token}`;

    for (let i = 1; i <= 120; i += 1) {
      await createMessage({
        conversationId: conversation.id,
        senderId: other.id,
        content: `message-${i}`,
      });
    }

    const first = await request(app)
      .get(url)
      .set('Authorization', auth);

    expect(first.status).toBe(200);
    expect(first.body.messages).toHaveLength(50);

    const second = await request(app)
      .get(url)
      .query({ before: first.body.nextBefore })
      .set('Authorization', auth);

    expect(second.status).toBe(200);
    expect(second.body.messages).toHaveLength(50);
    expect(second.body.messages[0].content).toBe('message-21');
    expect(second.body.messages[49].content).toBe('message-70');
    expect(second.body.hasMore).toBe(true);

    const third = await request(app)
      .get(url)
      .query({ before: second.body.nextBefore })
      .set('Authorization', auth);

    expect(third.status).toBe(200);
    expect(third.body.messages).toHaveLength(20);
    expect(third.body.messages[0].content).toBe('message-1');
    expect(third.body.messages[19].content).toBe('message-20');
    expect(third.body.hasMore).toBe(false);
    expect(third.body.nextBefore).toBeNull();
  });

  test('TC-HIS-04 prevents non-members from reading conversation history', async () => {
    const me = await createUser({ username: 'history_member' });
    const other = await createUser({ username: 'history_other_member' });
    const outsider = await createUser({ username: 'history_outsider' });

    await Contact.create([
      { userId: me.id, contactUserId: other.id },
    ]);

    const conversation = await getOrCreateDirect(me.id, other.id);

    await createMessage({
      conversationId: conversation.id,
      senderId: other.id,
      content: 'private message',
    });

    const res = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(res.status).toBe(403);
  });
});
