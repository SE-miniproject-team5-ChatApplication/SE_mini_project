
const request = require('supertest');

const {
  describeDb,
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');

const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { createMessage } = require('../../src/services/messageService');

describeDb('REQ-HIS-5 export conversation as CSV', () => {
  const app = createApp();

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-HIS-03 CSV has the Chat History Report columns and escapes content', async () => {
    const { a, conversationId } = await createDirectChat();

    await createMessage({
      conversationId,
      senderId: a.id,
      content: 'hello, "team"',
    });

    const response = await request(app)
      .get(`/api/conversations/${conversationId}/export`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toContain('.csv');

    const [header, row] = response.text
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');

    expect(header).toBe(
      '"Conversation Name","Sender Name","Message Content","Sent At","Status","Attachment File Name","Exported By","Export Date"'
    );

    expect(row).toContain('"hello, ""team"""');
  });

  test('a non-member cannot export another conversation history', async () => {
    const { conversationId } = await createDirectChat();
    const outsider = await createUser();

    const response = await request(app)
      .get(`/api/conversations/${conversationId}/export`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(response.status).toBe(403);
  });

  test('an unauthenticated user cannot export conversation history', async () => {
    const { conversationId } = await createDirectChat();

    const response = await request(app)
      .get(`/api/conversations/${conversationId}/export`);

    expect(response.status).toBe(401);
  });
});
