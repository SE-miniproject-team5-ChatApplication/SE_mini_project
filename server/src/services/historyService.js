
 // History Service (component C9): conversation list and paginated message history.
const { Member, Conversation, User, Message } = require('../models');
const { assertId } = require('../utils/ids');
const { Errors } = require('../utils/errors');

// REQ-HIS-1: List conversations, most recent activity first.
async function listConversations(userId) {
  const memberships = await Member.find({ userId }).lean();
  if (memberships.length === 0) return [];

  const byConversation = new Map(
    memberships.map((m) => [String(m.conversationId), m])
  );

  const conversations = await Conversation.find({
    _id: { $in: [...byConversation.keys()] },
  })
    .sort({ lastMessageAt: -1 })
    .lean();

  const directIds = conversations
    .filter((c) => c.type === 'direct')
    .map((c) => c._id);

  const others = await Member.find({
    conversationId: { $in: directIds },
    userId: { $ne: userId },
  }).lean();

  const users = await User.find({
    _id: { $in: others.map((o) => o.userId) },
  });

  const userById = new Map(
    users.map((u) => [String(u._id), u])
  );

  const otherByConversation = new Map(
    others.map((o) => [
      String(o.conversationId),
      userById.get(String(o.userId)),
    ])
  );

  return conversations.map((c) => {
    const id = String(c._id);
    const me = byConversation.get(id);
    const other = otherByConversation.get(id);

    return {
      id,
      type: c.type,
      name:
        c.type === 'group'
          ? c.name
          : other
            ? other.displayName
            : 'Deleted user',
      otherUser:
        c.type === 'direct' && other
          ? other.toPublic()
          : null,
      lastMessage:
        c.lastMessage && c.lastMessage.sentAt
          ? {
              preview: c.lastMessage.preview,
              senderId: c.lastMessage.senderId
                ? String(c.lastMessage.senderId)
                : null,
              type: c.lastMessage.type,
              sentAt: c.lastMessage.sentAt,
            }
          : null,
      lastActivityAt: c.lastMessageAt,
      unread: me.unreadCount,
      muted: me.muted,
      role: me.role,
    };
  });
}

// REQ-HIS-2: Load the latest 50 messages or 50 older messages.
async function listMessages(userId, conversationId, before) {
  assertId(conversationId, 'conversationId');

  // Verify membership before allowing access to conversation history.
  const membership = await Member.findOne({
    userId,
    conversationId,
  }).lean();

  if (!membership) {
    throw Errors.forbidden(
      'You are not a member of this conversation'
    );
  }

  const pageSize = 50;
  const filter = { conversationId };

  // The cursor identifies the oldest message from the previous page.
  if (before) {
    assertId(before, 'before');

    const cursor = await Message.findOne({
      _id: before,
      conversationId,
    }).lean();

    if (!cursor) {
      throw Errors.validation(
        'Invalid message cursor for this conversation',
        'before'
      );
    }

    filter.$or = [
      { sentAt: { $lt: cursor.sentAt } },
      {
        sentAt: cursor.sentAt,
        _id: { $lt: cursor._id },
      },
    ];
  }

  // Fetch one extra record to determine whether older messages exist.
  const rows = await Message.find(filter)
    .sort({ sentAt: -1, _id: -1 })
    .limit(pageSize + 1)
    .lean();

  const hasMore = rows.length > pageSize;

  // Return messages in chronological order for the client.
  const messages = rows.slice(0, pageSize).reverse();

  return {
    messages,
    hasMore,
    nextBefore:
      hasMore && messages.length > 0
        ? String(messages[0]._id)
        : null,
  };
}

module.exports = {
  listConversations,
  listMessages,
};
