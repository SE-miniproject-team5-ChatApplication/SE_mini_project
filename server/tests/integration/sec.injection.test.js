const http = require('http');
const express = require('express');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { rejectUnsafeKeys } = require('../../src/middleware/rejectUnsafeKeys');
const { errorHandler } = require('../../src/middleware/errorHandler');
const { protectSocket } = require('../../src/utils/safeSocket');
const { createApp } = require('../../src/app');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

describe('NFR-SEC-5 unsafe keys are rejected (REST)', () => {
  const app = express();
  app.use(express.json());
  app.use(rejectUnsafeKeys);
  app.post('/echo', (req, res) => res.json(req.body));
  app.use(errorHandler);
  const post = (body) => request(app).post('/echo').set('Content-Type', 'application/json').send(body);

  test.each([
    ['a MongoDB operator', { password: { $ne: '' } }, 'password'],
    ['a nested operator', { filter: { user: { $gt: '' } } }, 'filter'],
    ['a dotted key', { 'profile.role': 'admin' }, 'profile.role'],
  ])('TC-SEC-05 rejects %s with 400', async (_name, body, field) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
  });

  test('TC-SEC-05 rejects __proto__ (prototype pollution)', async () => {
    const res = await post('{"__proto__": {"isAdmin": true}}');
    expect(res.status).toBe(400);
  });

  test('TC-SEC-05 rejects very deep nesting', async () => {
    let body = { end: true };
    for (let i = 0; i < 15; i += 1) body = { level: body };
    expect((await post(body)).status).toBe(400);
  });

  test('TC-SEC-05 allows normal input, including "$" and "." inside values', async () => {
    const body = { content: 'costs $5.00 {"$ne": 1}', email: 'a.b@test.com' };
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(body);
  });

  test('TC-SEC-05 URL query values are plain strings, never objects', () => {
    expect(createApp().get('query parser')).toBe('simple');
  });
});

describeDb('NFR-SEC-5 login cannot be bypassed with an operator', () => {
  const app = createApp();
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-SEC-05 {"password": {"$ne": ""}} is rejected, not logged in', async () => {
    await createUser({ username: 'alice_1', password: 'secret123' });
    const res = await request(app).post('/api/auth/login').send({ identifier: 'alice_1', password: { $ne: '' } });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });
});

describe('NFR-SEC-5 unsafe keys are rejected (sockets)', () => {
  let server;
  let io;
  let client;
  const received = [];

  beforeAll(async () => {
    server = http.createServer();
    io = new Server(server);
    io.on('connection', (socket) => {
      protectSocket(socket);
      socket.on('echo', (payload, ack) => {
        received.push(payload);
        ack({ ok: true, payload });
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    client = connect(`http://127.0.0.1:${server.address().port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    await new Promise((resolve) => client.once('connect', resolve));
  });

  afterAll(async () => {
    client.close();
    io.close();
    await new Promise((resolve) => server.close(() => resolve()));
  });

  test('TC-SEC-05 an operator in a socket payload is rejected before the handler runs', async () => {
    const ack = await client.timeout(2000).emitWithAck('echo', { conversationId: { $ne: '' } });
    expect(ack.ok).toBe(false);
    expect(ack.error.code).toBe('VALIDATION_ERROR');
    expect(received).toHaveLength(0);
  });

  test('TC-SEC-05 a normal socket payload still works', async () => {
    const ack = await client.timeout(2000).emitWithAck('echo', { content: 'hi $1' });
    expect(ack.ok).toBe(true);
  });
});
