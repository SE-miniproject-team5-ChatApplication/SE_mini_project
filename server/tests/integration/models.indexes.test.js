const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { User, Message } = require('../../src/models');
const mongoose = require('mongoose');

describeDb('SET-3 indexes (C12)', () => {
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('username and email are unique', async () => {
    await User.create({ username: 'raksha', email: 'r@test.com', passwordHash: 'h', displayName: 'R' });
    await expect(
      User.create({ username: 'RAKSHA', email: 'other@test.com', passwordHash: 'h', displayName: 'R' })
    ).rejects.toThrow(/duplicate key/);
  });

  test('messages have the (conversationId, sentAt) and text indexes', async () => {
    const indexes = await Message.collection.indexes();
    const keys = indexes.map((i) => JSON.stringify(i.key));
    expect(keys).toContain(JSON.stringify({ conversationId: 1, sentAt: 1, _id: 1 }));
    expect(indexes.some((i) => i.key._fts === 'text')).toBe(true);
  });

  test('the same clientMsgId from the same sender is stored once', async () => {
    const senderId = new mongoose.Types.ObjectId();
    const conversationId = new mongoose.Types.ObjectId();
    await Message.create({ conversationId, senderId, content: 'a', clientMsgId: 'c1' });
    await expect(Message.create({ conversationId, senderId, content: 'a', clientMsgId: 'c1' })).rejects.toThrow(/duplicate key/);
  });
});
