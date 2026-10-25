const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('REQ-HIS-2 paged history', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-HIS-01 120 messages load as 50, then 50, then 20 older ones', async () => {
    const { a, conversationId } = await createDirectChat();
    const base = Date.now() - 1000000;
    await Message.insertMany(
      Array.from({ length: 120 }, (_, i) => ({ conversationId, senderId: a.id, content: `m${i + 1}`, sentAt: new Date(base + i * 1000) }))
    );
    const get = (before) =>
      request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .query(before ? { before } : {})
        .set('Authorization', `Bearer ${a.token}`);

    const p1 = await get();
    expect(p1.status).toBe(200);
    expect(p1.body.messages).toHaveLength(50);
    expect(p1.body.messages[0].content).toBe('m71');
    expect(p1.body.messages[49].content).toBe('m120');
    expect(p1.body.hasMore).toBe(true);

    const p2 = await get(p1.body.messages[0].id);
    expect(p2.body.messages.map((m) => m.content)[0]).toBe('m21');
    expect(p2.body.messages).toHaveLength(50);

    const p3 = await get(p2.body.messages[0].id);
    expect(p3.body.messages).toHaveLength(20);
    expect(p3.body.messages[0].content).toBe('m1');
    expect(p3.body.hasMore).toBe(false);
  });
});
