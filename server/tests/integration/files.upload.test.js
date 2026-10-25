const request = require('supertest');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { Attachment } = require('../../src/models');

// Smallest valid PNG header + body, enough for type checks.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

describeDb('REQ-FIL-1 attach one file of up to 10 MB', () => {
  let srv;
  let socket;
  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });
  afterEach(async () => {
    if (socket) socket.close();
    await clearTestDb();
  });
  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  const upload = (token, conversationId, buffer, name) =>
    request(srv.app)
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .field('conversationId', conversationId)
      .attach('file', buffer, name);

  test('TC-FIL-01 upload then send it as a message', async () => {
    const { a, conversationId } = await createDirectChat();
    const res = await upload(a.token, conversationId, PNG, 'photo.png');
    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe('photo.png');
    expect(res.body.storagePath).toBeUndefined();

    socket = await connectClient(srv.url, a.token);
    const ack = await emitAck(socket, 'message:send', { conversationId, content: '', attachmentId: res.body.attachmentId });
    expect(ack.ok).toBe(true);
    expect(ack.message.type).toBe('file');
    expect(ack.message.attachment.fileName).toBe('photo.png');
  });

  test('TC-FIL-02 a file over 10 MB is rejected with 413 and nothing is stored', async () => {
    const { a, conversationId } = await createDirectChat();
    const big = Buffer.alloc(10 * 1024 * 1024 + 1);
    const res = await upload(a.token, conversationId, big, 'big.pdf');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    expect(await Attachment.countDocuments()).toBe(0);
  });

  test('a non-member cannot upload into the conversation', async () => {
    const { conversationId } = await createDirectChat();
    const c = await createUser();
    expect((await upload(c.token, conversationId, PNG, 'x.png')).status).toBe(403);
  });

  test("an attachment uploaded by someone else cannot be sent as one's own", async () => {
    const { a, b, conversationId } = await createDirectChat();
    const res = await upload(a.token, conversationId, PNG, 'photo.png');
    socket = await connectClient(srv.url, b.token);
    const ack = await emitAck(socket, 'message:send', { conversationId, content: 'x', attachmentId: res.body.attachmentId });
    expect(ack.ok).toBe(false);
  });
});
