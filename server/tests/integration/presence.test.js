const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, waitFor, waitForMatch } = require('../helpers/socket');
const { createDirectChat } = require('../helpers/chat');
const presenceService = require('../../src/services/presenceService');
const { User } = require('../../src/models');
const request = require('supertest');

describeDb('REQ-PRS-1 online/offline broadcast to contacts', () => {
  let srv;
  const sockets = [];
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    sockets.splice(0).forEach((s) => s.close());
    presenceService.reset();
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-PRS-01 A sees B online when B connects and offline when B disconnects', async () => {
    const { a, b } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    sockets.push(sa);

    const online = waitFor(sa, 'presence:update', 2000);
    const sb = await connectClient(srv.url, b.token);
    expect(await online).toMatchObject({ userId: b.id, status: 'online' });

    const offline = waitFor(sa, 'presence:update', 2000);
    sb.close();
    expect(await offline).toMatchObject({ userId: b.id, status: 'offline' });
  });

  test('TC-PRS-01 (REQ-PRS-2) last seen is stored and returned for offline users', async () => {
    const { a, b } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    sockets.push(sa);
    const sb = await connectClient(srv.url, b.token);
    const offline = waitForMatch(sa, 'presence:update', (p) => p.userId === b.id && p.status === 'offline');
    sb.close();
    const update = await offline;
    expect(update.lastSeen).toBeDefined();
    expect((await User.findById(b.id)).lastSeen).toBeInstanceOf(Date);

    const res = await request(srv.app).get('/api/presence').query({ ids: b.id }).set('Authorization', `Bearer ${a.token}`);
    expect(res.body[0]).toMatchObject({ userId: b.id, status: 'offline' });
    expect(res.body[0].lastSeen).toBeTruthy();
  });
});

describeDb('REQ-PRS-4 several open sessions', () => {
  let srv;
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    presenceService.reset();
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('TC-PRS-03 B stays online until the last tab disconnects', async () => {
    const { a, b } = await createDirectChat();
    const sa = await connectClient(srv.url, a.token);
    const tab1 = await connectClient(srv.url, b.token);
    const tab2 = await connectClient(srv.url, b.token);
    expect(presenceService.sessionCount(b.id)).toBe(2);

    const events = [];
    sa.on('presence:update', (p) => events.push(p.status));
    tab1.close();
    await new Promise((r) => setTimeout(r, 200)); // give the server time to process the disconnect
    expect(presenceService.isOnline(b.id)).toBe(true);
    expect(events).not.toContain('offline');

    const offline = waitForMatch(sa, 'presence:update', (p) => p.status === 'offline');
    tab2.close();
    await offline;
    expect(presenceService.isOnline(b.id)).toBe(false);
    sa.close();
  });
});
