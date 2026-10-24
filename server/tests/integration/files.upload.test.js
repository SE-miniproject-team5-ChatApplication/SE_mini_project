
const request = require('supertest');
const fs = require('fs/promises');

const {
  describeDb,
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { Attachment, Message } = require('../../src/models');
const { resolveStoragePath, removeFile } = require('../../src/services/fileStorage');
const { MAX_FILE_SIZE } = require('../../src/models/Attachment');

describeDb('REQ-FIL-1 message file attachments', () => {
  let srv;

  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });

  afterEach(async () => {
    const attachments = await Attachment.find({});
    await Promise.all(
      attachments.map((attachment) => removeFile(attachment.storagePath))
    );
    await clearTestDb();
  });

  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  test('a conversation member can upload a file and create a file message', async () => {
    const { a, conversationId } = await createDirectChat();
    const contents = Buffer.from('hello attachment');

    const response = await request(srv.app)
      .post(`/api/files/${conversationId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .attach('file', contents, {
        filename: 'hello.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(201);
    expect(response.body.attachment.fileName).toBe('hello.txt');
    expect(response.body.attachment.size).toBe(contents.length);
    expect(response.body.attachment.storagePath).toBeUndefined();
    expect(response.body.message.type).toBe('file');

    const attachment = await Attachment.findById(response.body.attachment.id);
    expect(attachment).not.toBeNull();
    expect(attachment.size).toBe(contents.length);

    const storedContents = await fs.readFile(
      resolveStoragePath(attachment.storagePath)
    );
    expect(storedContents.equals(contents)).toBe(true);

    const message = await Message.findById(response.body.message.id);
    expect(message).not.toBeNull();
    expect(message.type).toBe('file');
    expect(String(message.attachmentId)).toBe(String(attachment._id));
    expect(String(message.senderId)).toBe(a.id);
  });

  test('a conversation member can download an uploaded file', async () => {
    const { a, conversationId } = await createDirectChat();

    const uploadResponse = await request(srv.app)
      .post(`/api/files/${conversationId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .attach('file', Buffer.from('download me'), {
        filename: 'download.txt',
        contentType: 'text/plain',
      });

    expect(uploadResponse.status).toBe(201);

    const attachmentId = uploadResponse.body.attachment.id;

    const downloadResponse = await request(srv.app)
      .get(`/api/files/${attachmentId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-disposition']).toContain('download.txt');
    expect(downloadResponse.body.toString()).toBe('download me');
  });

  test('a non-member cannot upload into a conversation', async () => {
    const { conversationId } = await createDirectChat();
    const outsider = await createUser();

    const response = await request(srv.app)
      .post(`/api/files/${conversationId}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .attach('file', Buffer.from('not allowed'), {
        filename: 'secret.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(403);
    expect(await Attachment.countDocuments()).toBe(0);
    expect(await Message.countDocuments()).toBe(0);
  });

  test('a non-member cannot download another conversation member’s file', async () => {
    const { a, conversationId } = await createDirectChat();
    const uploadResponse = await request(srv.app)
      .post(`/api/files/${conversationId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .attach('file', Buffer.from('private file'), {
        filename: 'private.txt',
        contentType: 'text/plain',
      });

    expect(uploadResponse.status).toBe(201);

    const outsider = await createUser();
    const response = await request(srv.app)
      .get(`/api/files/${uploadResponse.body.attachment.id}`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(response.status).toBe(403);
  });

  test('an upload larger than 10 MB is rejected', async () => {
    const { a, conversationId } = await createDirectChat();
    const oversizedFile = Buffer.alloc(MAX_FILE_SIZE + 1, 'a');

    const response = await request(srv.app)
      .post(`/api/files/${conversationId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .attach('file', oversizedFile, {
        filename: 'too-large.bin',
        contentType: 'application/octet-stream',
      });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    expect(await Attachment.countDocuments()).toBe(0);
    expect(await Message.countDocuments()).toBe(0);
  });

  test('an upload without a file is rejected', async () => {
    const { a, conversationId } = await createDirectChat();

    const response = await request(srv.app)
      .post(`/api/files/${conversationId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .field('description', 'no file attached');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
