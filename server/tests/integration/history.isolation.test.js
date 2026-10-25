const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { createMessage } = require('../../src/services/messageService');

describeDb('REQ-HIS-4 history only for participants', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-HIS-02 a non-participant cannot read the history (403) or see the conversation', async () => {
    const { a, conversationId } = await createDirectChat();
    await createMessage({ conversationId, senderId: a.id, content: 'private meeting notes' });
    const c = await createUser();

    const res = await request(app).get(`/api/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${c.token}`);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('private meeting notes');

    const list = await request(app).get('/api/conversations').set('Authorization', `Bearer ${c.token}`);
    expect(list.body).toEqual([]);
  });

  test('participants can read it', async () => {
    const { b, conversationId, a } = await createDirectChat();
    await createMessage({ conversationId, senderId: a.id, content: 'hi' });
    const res = await request(app).get(`/api/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${b.token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });
});
