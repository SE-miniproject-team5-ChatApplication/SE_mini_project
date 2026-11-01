const request = require('supertest');
const { createApp } = require('../../src/app');
const { Message, Member } = require('../../src/models');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { seedPerfData } = require('../helpers/perfData');

async function timed(fn) {
  const t = Date.now();
  const res = await fn();
  return { res, ms: Date.now() - t };
}

function planOf(explain) {
  const doc = Array.isArray(explain) ? explain[0] : explain;
  return { text: JSON.stringify(doc), docsExamined: doc.executionStats.totalDocsExamined };
}

describeDb('NFR-PERF-3 dashboard <= 3 s, latest 50 messages <= 1 s', () => {
  const app = createApp();
  let data;
  const get = (url) => request(app).get(url).set('Authorization', `Bearer ${data.me.token}`);

  beforeAll(async () => {
    await connectTestDb();
    data = await seedPerfData({ conversations: 100, messages: 10000 });
  }, 60000);
  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  test('TC-PERF-03 dashboard with 100 conversations loads in under 3 s', async () => {
    const { res, ms } = await timed(() => get('/api/conversations'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(100);
    expect(res.body[0].id).toBe(data.bigConversationId); // most recent first
    expect(ms).toBeLessThan(3000);
  });

  test('TC-PERF-03 latest 50 of 10,000 messages load in under 1 s', async () => {
    const { res, ms } = await timed(() => get(`/api/conversations/${data.bigConversationId}/messages`));
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(50);
    expect(res.body.hasMore).toBe(true);
    expect(res.body.messages[49].content).toBe(`message ${data.messages - 1} about bug report`);
    expect(ms).toBeLessThan(1000);
  });

  test('TC-PERF-03 an older page (scrolling up) also loads in under 1 s', async () => {
    const first = await get(`/api/conversations/${data.bigConversationId}/messages`);
    const oldestShown = first.body.messages[0].id;
    const { res, ms } = await timed(() =>
      get(`/api/conversations/${data.bigConversationId}/messages?before=${oldestShown}`)
    );
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(50);
    expect(ms).toBeLessThan(1000);
  });

  test('TC-PERF-03 latest messages use the index, reading only ~50 of 10,000', async () => {
    const explain = await Message.find({ conversationId: data.bigConversationId })
      .sort({ sentAt: -1, _id: -1 })
      .limit(51)
      .explain('executionStats');
    const plan = planOf(explain);
    expect(plan.text).not.toMatch(/COLLSCAN/);
    expect(plan.docsExamined).toBeLessThanOrEqual(51);
  });

  test('TC-PERF-03 the dashboard membership lookup uses an index', async () => {
    const explain = await Member.find({ userId: data.me.id }).explain('executionStats');
    expect(planOf(explain).text).not.toMatch(/COLLSCAN/);
  });
});
