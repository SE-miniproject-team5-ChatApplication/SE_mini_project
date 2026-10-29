const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { createMessage } = require('../../src/services/messageService');

describeDb('REQ-HIS-3 / REQ-HIS-4 keyword search', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  const search = (user, query) => request(app).get('/api/search').query(query).set('Authorization', `Bearer ${user.token}`);

  test('TC-HIS-02 "meeting" and "MEETING" give the same results', async () => {
    const { a, conversationId } = await createDirectChat();
    await createMessage({ conversationId, senderId: a.id, content: 'Team meeting at 5' });
    await createMessage({ conversationId, senderId: a.id, content: 'unrelated' });
    const lower = await search(a, { q: 'meeting' });
    const upper = await search(a, { q: 'MEETING' });
    expect(lower.status).toBe(200);
    expect(lower.body).toHaveLength(1);
    expect(upper.body.map((r) => r.message.id)).toEqual(lower.body.map((r) => r.message.id));
    expect(lower.body[0].snippet).toContain('meeting');
  });

  test('TC-HIS-02 user C (not a participant) gets none of the other users\' messages', async () => {
    const { a, conversationId } = await createDirectChat();
    await createMessage({ conversationId, senderId: a.id, content: 'Team meeting at 5' });
    const c = await createUser();
    expect((await search(c, { q: 'meeting' })).body).toEqual([]);
    expect((await search(c, { q: 'meeting', conversationId })).status).toBe(403);
  });

  test('search within one conversation; regex characters are plain text', async () => {
    const { a, conversationId } = await createDirectChat();
    await createMessage({ conversationId, senderId: a.id, content: 'price is $5 (approx.)' });
    expect((await search(a, { q: '(approx.)', conversationId })).body).toHaveLength(1);
    expect((await search(a, { q: 'x' })).status).toBe(400);
  });
});
