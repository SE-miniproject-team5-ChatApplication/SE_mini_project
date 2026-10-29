
const request = require('supertest');

const {
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');

const { startTestServer } = require('../helpers/server');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');

describe('NFR-SAFE-3 secure attachment downloads', () => {
  let srv;

  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    if (srv) {
      await srv.close();
    }
    await disconnectTestDb();
  });

  async function uploadTextFile(token, conversationId) {
    const content = Buffer.from(
      'NFR-SAFE-3 security test content',
      'utf8'
    );

    const response = await request(srv.app)
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .field('conversationId', conversationId)
      .attach('file', content, 'security-test.txt');

    expect(response.status).toBe(201);
    return response.body.attachmentId;
  }

  test('serves an attachment with safe download headers and correct content', async () => {
    const { a, conversationId } = await createDirectChat();
    const attachmentId = await uploadTextFile(
      a.token,
      conversationId
    );

    const response = await request(srv.app)
      .get(`/api/files/${attachmentId}`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(response.status).toBe(200);

    expect(response.headers['content-type']).toMatch(/text\/plain/);
    expect(response.headers['content-disposition']).toMatch(/^attachment;/);
    expect(response.headers['content-disposition']).toContain(
      'security-test.txt'
    );
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['cache-control']).toBe('private, no-store');

    expect(response.text).toBe(
      'NFR-SAFE-3 security test content'
    );
  });

  test('denies downloads to a user outside the conversation', async () => {
    const { a, conversationId } = await createDirectChat();
    const outsider = await createUser();

    const attachmentId = await uploadTextFile(
      a.token,
      conversationId
    );

    const response = await request(srv.app)
      .get(`/api/files/${attachmentId}`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(response.status).toBe(403);
  });

  test('rejects unauthenticated download requests', async () => {
    const { a, conversationId } = await createDirectChat();

    const attachmentId = await uploadTextFile(
      a.token,
      conversationId
    );

    const response = await request(srv.app)
      .get(`/api/files/${attachmentId}`);

    expect(response.status).toBe(401);
  });

  test('returns 404 for a nonexistent attachment', async () => {
    const { a } = await createDirectChat();

    const response = await request(srv.app)
      .get('/api/files/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${a.token}`);

    expect(response.status).toBe(404);
  });
});
