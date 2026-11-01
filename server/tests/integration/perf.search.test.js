const request = require('supertest');
const { createApp } = require('../../src/app');
const { Message } = require('../../src/models');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { seedPerfData } = require('../helpers/perfData');

async function timed(fn) {
  const t = Date.now();
  const res = await fn();
  return { res, ms: Date.now() - t };
}

describeDb('NFR-PERF-4 search over 10,000 messages <= 2 s', () => {
  const app = createApp();
  let data;
  const search = (query) => request(app).get('/api/search').query(query).set('Authorization', `Bearer ${data.me.token}`);

  beforeAll(async () => {
    await connectTestDb();
    data = await seedPerfData({ conversations: 100, messages: 10000 });
  }, 60000);
  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  test('TC-PERF-04 a rare word across all conversations is found in under 2 s', async () => {
    const { res, ms } = await timed(() => search({ q: 'RAREWORD' }));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0].snippet).toMatch(/rareword/);
    expect(ms).toBeLessThan(2000);
  });

  test('TC-PERF-04 a common phrase returns the newest 50 matches in under 2 s', async () => {
    const { res, ms } = await timed(() => search({ q: 'exam notes' }));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(50);
    expect(ms).toBeLessThan(2000);
  });

  test('TC-PERF-04 searching inside one conversation takes under 2 s', async () => {
    const { res, ms } = await timed(() => search({ q: 'rareword', conversationId: data.bigConversationId }));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(ms).toBeLessThan(2000);
  });

  test('TC-PERF-04 worst case (no match, all 10,000 checked) takes under 2 s', async () => {
    const { res, ms } = await timed(() => search({ q: 'nothing-matches-this' }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(ms).toBeLessThan(2000);
  });

  test('TC-PERF-04 the search query is narrowed by the conversation index, not a full scan', async () => {
    const explain = await Message.find({
      conversationId: { $in: [data.bigConversationId] },
      type: { $ne: 'system' },
      status: { $ne: 'deleted' },
      content: /rareword/i,
    })
      .sort({ sentAt: -1, _id: -1 })
      .limit(50)
      .explain('executionStats');
    const doc = Array.isArray(explain) ? explain[0] : explain;
    expect(JSON.stringify(doc)).not.toMatch(/COLLSCAN/);
  });
});
