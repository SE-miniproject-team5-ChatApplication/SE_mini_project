
const { Member, Message } = require('../models');
const { Errors } = require('../utils/errors');

const SEARCH_LIMIT = 50;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchMessages(userId, query) {
  if (
    typeof query !== 'string' ||
    query.trim().length < 2 ||
    query.trim().length > 100
  ) {
    throw Errors.validation(
      'Search text must be 2-100 characters',
      'q'
    );
  }

  const pattern = new RegExp(escapeRegex(query.trim()), 'i');

  const memberships = await Member.find({ userId })
    .select('conversationId')
    .lean();

  if (memberships.length === 0) return [];

  const conversationIds = memberships.map(
    (membership) => membership.conversationId
  );

  const messages = await Message.find({
    conversationId: { $in: conversationIds },
    content: pattern,
    status: { $ne: 'deleted' },
  })
    .sort({ sentAt: -1, _id: -1 })
    .limit(SEARCH_LIMIT)
    .lean();

  return messages.map((message) => ({
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderId: message.senderId ? String(message.senderId) : null,
    content: message.content,
    sentAt: message.sentAt,
    type: message.type,
  }));
}

module.exports = { searchMessages, SEARCH_LIMIT };
