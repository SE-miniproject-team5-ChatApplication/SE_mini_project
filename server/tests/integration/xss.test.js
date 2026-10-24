const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck, waitFor } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');

describeDb('NFR-SAFE-2 XSS payloads travel as plain JSON text', () => {
  let srv;
  const sockets = [];
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    sockets.splice(0).forEach((s) => s.close());
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-SEC-01 <script> message is delivered unchanged as a JSON string', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const sb = await connectClient(srv.url, b.token);
    sockets.push(sa, sb);
    const payload = '<script>alert(1)</script>';
    const got = waitFor(sb, 'message:new');
    await emitAck(sa, 'message:send', { conversationId, content: payload });
    expect((await got).content).toBe(payload);
  });

  test('API responses are JSON with security headers (helmet)', async () => {
    const res = await request(srv.app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});
