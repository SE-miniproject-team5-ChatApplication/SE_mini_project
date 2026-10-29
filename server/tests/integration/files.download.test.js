
const request = require('supertest');
const fs = require('fs/promises');
const config = require('../../src/config');

const {
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');

const { startTestServer } = require('../helpers/server');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { Attachment } = require('../../src/models');
const fileStorage = require('../../src/services/fileStorage');

describe('REQ-FIL-4 attachment downloads', () => {
  let srv;

  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  async function uploadTextFile(token, conversationId) {
    const content = Buffer.from('REQ-FIL-4 download test content', 'utf8');

    const response = await request(srv.app)
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .field('conversationId', conversationId)
      .attach('file', content, 'download-test.txt');

    expect(response.status).toBe(201);
    return response.body.attachmentId;
  }

  test('allows an authenticated conversation member to download an attachment', async () => {
    const { a, conversationId } = await createDirectChat();
    const attachmentId = await uploadTextFile(a.token, conversationId);

    const response = await request(srv.app)
      .get(`/api/files/${attachmentId}`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/plain/);
    expect(response.headers['content-disposition']).toContain('download-test.txt');
    expect(response.text).toBe('REQ-FIL-4 download test content');
  });

  test('denies a user who is not a member of the attachment conversation', async () => {
    const { a, conversationId } = await createDirectChat();
    const outsider = await createUser();
    const attachmentId = await uploadTextFile(a.token, conversationId);

    const response = await request(srv.app)
      .get(`/api/files/${attachmentId}`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(response.status).toBe(403);
  });

  test('rejects an unauthenticated download request', async () => {
    const { a, conversationId } = await createDirectChat();
    const attachmentId = await uploadTextFile(a.token, conversationId);

    const response = await request(srv.app)
      .get(`/api/files/${attachmentId}`);

    expect(response.status).toBe(401);
  });

  test('returns 404 when the attachment does not exist', async () => {
    const { a } = await createDirectChat();

    const response = await request(srv.app)
      .get('/api/files/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${a.token}`);

    expect(response.status).toBe(404);
  });
});
