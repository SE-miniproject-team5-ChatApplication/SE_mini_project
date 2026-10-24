// History Service (component C9): conversation list, paged history, search, export.
const { Member, Conversation, User } = require('../models');

// REQ-HIS-1: the user's conversations, most recent activity first, each with
// the last message preview and time.
async function listConversations(userId) {
  const memberships = await Member.find({ userId }).lean();
  if (memberships.length === 0) return [];
  const byConversation = new Map(memberships.map((m) => [String(m.conversationId), m]));

  const conversations = await Conversation.find({ _id: { $in: [...byConversation.keys()] } })
    .sort({ lastMessageAt: -1 })
    .lean();

  // For direct chats the name shown is the other person's display name.
  const directIds = conversations.filter((c) => c.type === 'direct').map((c) => c._id);
  const others = await Member.find({ conversationId: { $in: directIds }, userId: { $ne: userId } }).lean();
  const users = await User.find({ _id: { $in: others.map((o) => o.userId) } });
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const otherByConversation = new Map(others.map((o) => [String(o.conversationId), userById.get(String(o.userId))]));

  return conversations.map((c) => {
    const id = String(c._id);
    const me = byConversation.get(id);
    const other = otherByConversation.get(id);
    return {
      id,
      type: c.type,
      name: c.type === 'group' ? c.name : other ? other.displayName : 'Deleted user',
      otherUser: c.type === 'direct' && other ? other.toPublic() : null,
      lastMessage: c.lastMessage && c.lastMessage.sentAt
        ? {
            preview: c.lastMessage.preview,
            senderId: c.lastMessage.senderId ? String(c.lastMessage.senderId) : null,
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

module.exports = { listConversations };
