
const request = require('supertest');

const {
  describeDb,
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');

const { createApp } = require('../../src/app');
const { createDirectChat } = require('../helpers/chat');
const { createUser } = require('../helpers/factory');
const { Member } = require('../../src/models');

describeDb('DD-NOT conversation mute preferences', () => {
  const app = createApp();

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('a conversation member can mute notifications', async () => {
    const { a, conversationId } = await createDirectChat();

    const response = await request(app)
      .put(`/api/conversations/${conversationId}/mute`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ muted: true });

    expect(response.status).toBe(204);

    const member = await Member.findOne({
      conversationId,
      userId: a.id,
    });

    expect(member.muted).toBe(true);
  });

  test('a conversation member can unmute notifications', async () => {
    const { a, conversationId } = await createDirectChat();

    await Member.updateOne(
      { conversationId, userId: a.id },
      { $set: { muted: true } }
    );

    const response = await request(app)
      .put(`/api/conversations/${conversationId}/mute`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ muted: false });

    expect(response.status).toBe(204);

    const member = await Member.findOne({
      conversationId,
      userId: a.id,
    });

    expect(member.muted).toBe(false);
  });

  test('muting a conversation does not change another member preference', async () => {
    const { a, b, conversationId } = await createDirectChat();

    const response = await request(app)
      .put(`/api/conversations/${conversationId}/mute`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ muted: true });

    expect(response.status).toBe(204);

    const memberA = await Member.findOne({
      conversationId,
      userId: a.id,
    });

    const memberB = await Member.findOne({
      conversationId,
      userId: b.id,
    });

    expect(memberA.muted).toBe(true);
    expect(memberB.muted).toBe(false);
  });

  test('a non-member cannot change conversation mute preferences', async () => {
    const { conversationId } = await createDirectChat();
    const outsider = await createUser();

    const response = await request(app)
      .put(`/api/conversations/${conversationId}/mute`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ muted: true });

    expect(response.status).toBe(403);
  });

  test.each([
    ['missing muted value', {}],
    ['string muted value', { muted: 'true' }],
    ['numeric muted value', { muted: 1 }],
    ['null muted value', { muted: null }],
  ])('rejects %s', async (_description, body) => {
    const { a, conversationId } = await createDirectChat();

    const response = await request(app)
      .put(`/api/conversations/${conversationId}/mute`)
      .set('Authorization', `Bearer ${a.token}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('an unauthenticated user cannot change mute preferences', async () => {
    const { conversationId } = await createDirectChat();

    const response = await request(app)
      .put(`/api/conversations/${conversationId}/mute`)
      .send({ muted: true });

    expect(response.status).toBe(401);
  });
});
