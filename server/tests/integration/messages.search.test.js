
const request = require('supertest');
const {
  describeDb,
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');
const { createApp } = require('../../src/app');
const { createUser } = require('../helpers/factory');
const { Contact } = require('../../src/models');
const {
  getOrCreateDirect,
} = require('../../src/services/conversationService');
const {
  createMessage,
} = require('../../src/services/messageService');

describeDb('REQ-HIS-4 message search isolation', () => {
  const app = createApp();

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('returns only matching messages from the user’s conversations', async () => {
    const alice = await createUser({ username: 'search_alice' });
    const bob = await createUser({ username: 'search_bob' });
    const carol = await createUser({ username: 'search_carol' });

    // Create the contacts required by the direct-conversation service.
    await Contact.create([
      { userId: alice.id, contactUserId: bob.id },
      { userId: bob.id, contactUserId: alice.id },
      { userId: bob.id, contactUserId: carol.id },
      { userId: carol.id, contactUserId: bob.id },
    ]);

    const aliceBob = await getOrCreateDirect(alice.id, bob.id);
    const bobCarol = await getOrCreateDirect(bob.id, carol.id);

    await createMessage({
      conversationId: aliceBob.id,
      senderId: bob.id,
      content: 'project keyword visible',
    });

    await createMessage({
      conversationId: bobCarol.id,
      senderId: bob.id,
      content: 'project keyword private',
    });

    // Alice must only see the match in her own conversation with Bob.
    const aliceResponse = await request(app)
      .get('/api/messages/search')
      .query({ q: 'project keyword' })
      .set('Authorization', `Bearer ${alice.token}`);

    expect(aliceResponse.status).toBe(200);
    expect(aliceResponse.body).toHaveLength(1);
    expect(aliceResponse.body[0].content).toBe(
      'project keyword visible'
    );
    expect(aliceResponse.body[0].conversationId).toBe(
      String(aliceBob.id)
    );

    // Carol must only see the match in her own conversation with Bob.
    const carolResponse = await request(app)
      .get('/api/messages/search')
      .query({ q: 'project keyword' })
      .set('Authorization', `Bearer ${carol.token}`);

    expect(carolResponse.status).toBe(200);
    expect(carolResponse.body).toHaveLength(1);
    expect(carolResponse.body[0].content).toBe(
      'project keyword private'
    );
    expect(carolResponse.body[0].conversationId).toBe(
      String(bobCarol.id)
    );
  });

  test('returns an empty array when no messages match', async () => {
    const user = await createUser({
      username: 'search_no_match',
    });

    const response = await request(app)
      .get('/api/messages/search')
      .query({ q: 'unknown keyword' })
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('rejects a keyword shorter than two characters', async () => {
    const user = await createUser({
      username: 'search_validation',
    });

    const response = await request(app)
      .get('/api/messages/search')
      .query({ q: 'x' })
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(400);
  });

  test('requires authentication', async () => {
    const response = await request(app)
      .get('/api/messages/search')
      .query({ q: 'project' });

    expect(response.status).toBe(401);
  });
});
