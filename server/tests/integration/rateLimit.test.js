const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const { Message } = require('../../src/models');

describeDb('NFR-SEC-6 rate limiting', () => {
  let srv;
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(clearTestDb);
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-SEC-02 25 messages in 10 s: 20 stored, 5 refused with RATE_LIMITED', async () => {
    const { a, conversationId } = await createDirectChat();
    const socket = await connectClient(srv.url, a.token);
    const acks = [];
    for (let i = 0; i < 25; i += 1) acks.push(await emitAck(socket, 'message:send', { conversationId, content: `m${i}` }));
    expect(acks.filter((x) => x.ok)).toHaveLength(20);
    expect(acks.filter((x) => !x.ok).every((x) => x.error.code === 'RATE_LIMITED')).toBe(true);
    expect(await Message.countDocuments({ conversationId })).toBe(20);
    socket.close();
  });

  test('TC-SEC-02 more than 100 REST requests a minute from one IP get 429; server stays responsive', async () => {
    const results = [];
    for (let i = 0; i < 105; i += 1) results.push((await request(srv.server).get('/api/health')).status);
    expect(results.slice(0, 100).every((s) => s === 200)).toBe(true);
    expect(results.slice(100).every((s) => s === 429)).toBe(true);
  });
});
