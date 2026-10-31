// Fills the test database with realistic volumes for performance tests
// (NFR-PERF-3, NFR-PERF-4): one user in many direct conversations, one of
// which has a long message history.
const { User, Conversation, Member, Message } = require('../../src/models');
const { createUser } = require('./factory');

const TOPICS = ['project deadline', 'lunch plans', 'exam notes', 'weekend trip', 'bug report'];

async function seedPerfData({ conversations = 100, messages = 10000 } = {}) {
  const me = await createUser({ username: 'perf_me' });
  const others = await User.insertMany(
    Array.from({ length: conversations }, (_, i) => ({
      username: `perf_u${i}`,
      email: `perf_u${i}@test.com`,
      passwordHash: 'not-a-real-hash',
      displayName: `Perf User ${i}`,
    }))
  );

  const start = Date.now() - (messages + conversations) * 1000;
  const convs = await Conversation.insertMany(
    others.map((o, i) => ({
      type: 'direct',
      createdBy: me.user._id,
      directKey: Conversation.directKeyFor(me.user._id, o._id),
      lastMessage: { senderId: o._id, preview: `hello ${i}`, type: 'text', sentAt: new Date(start + i * 1000) },
      lastMessageAt: new Date(start + i * 1000),
    }))
  );

  await Member.insertMany(
    convs.flatMap((c, i) => [
      { conversationId: c._id, userId: me.user._id },
      { conversationId: c._id, userId: others[i]._id },
    ])
  );

  // One conversation with a long history; inserted directly for speed.
  const big = convs[0];
  const base = start + conversations * 1000;
  const docs = Array.from({ length: messages }, (_, i) => ({
    conversationId: big._id,
    senderId: i % 2 ? me.user._id : others[0]._id,
    type: 'text',
    content: `message ${i} about ${TOPICS[i % TOPICS.length]}${i % 1000 === 0 ? ' rareword' : ''}`,
    attachmentId: null,
    sentAt: new Date(base + i * 1000),
    status: 'sent',
    deliveredTo: [],
    readBy: [],
    deletedAt: null,
  }));
  await Message.collection.insertMany(docs, { ordered: false });

  const lastAt = new Date(base + (messages - 1) * 1000);
  await Conversation.updateOne(
    { _id: big._id },
    {
      lastMessageAt: lastAt,
      lastMessage: { senderId: me.user._id, preview: `message ${messages - 1}`, type: 'text', sentAt: lastAt },
    }
  );

  return { me, bigConversationId: String(big._id), conversations, messages };
}

module.exports = { seedPerfData, TOPICS };
