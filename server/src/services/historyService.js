
// History Service (DD-HIS / component C9).
// Module owner: Raksha Arun (SRS Appendix C).
// Responsibility: conversation listing, paginated message history,
// keyword search, and conversation-history export.
// Route handlers delegate all history business logic to this service.

const { Member, Conversation, User, Message } = require('../models');
const { Errors } = require('../utils/errors');
const { isValidId } = require('../utils/ids');
const { serialize } = require('./messageService');
const { assertMember, conversationIdsOf } = require('./membershipService');
const { escapeRegex } = require('./userService');

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 50000;

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

// REQ-HIS-2: newest 50 messages first; then 50 older ones each time the user
// scrolls to the top. `before` is the id of the oldest message already shown.
async function getMessages(conversationId, { before, limit } = {}) {
  const size = Math.min(Math.max(Number(limit) || PAGE_SIZE, 1), PAGE_SIZE);
  const filter = { conversationId };
  if (before !== undefined) {
    if (!isValidId(before)) throw Errors.validation('Invalid "before" cursor', 'before');
    const cursor = await Message.findOne({ _id: before, conversationId }).select('sentAt').lean();
    if (!cursor) throw Errors.validation('Invalid "before" cursor', 'before');
    filter.$or = [{ sentAt: { $lt: cursor.sentAt } }, { sentAt: cursor.sentAt, _id: { $lt: cursor._id } }];
  }
  const page = await Message.find(filter)
    .sort({ sentAt: -1, _id: -1 })
    .limit(size + 1)
    .populate('attachmentId');
  const hasMore = page.length > size;
  const messages = page.slice(0, size).reverse().map(serialize);
  return { messages, hasMore };
}

// Short piece of text around the first match, for the results list.
function snippetOf(content, q) {
  const i = content.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, i - 40);
  const end = Math.min(content.length, i + q.length + 40);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

// REQ-HIS-3: case-insensitive keyword search in one conversation or in all of
// the user's conversations. REQ-HIS-4: only conversations the user is in.
async function search(userId, { q, conversationId } = {}) {
  const query = typeof q === 'string' ? q.trim() : '';
  if (query.length < 2) throw Errors.validation('Type at least 2 characters to search', 'q');
  if (query.length > 100) throw Errors.validation('Search text is too long', 'q');

  let scope;
  if (conversationId !== undefined && conversationId !== '') {
    await assertMember(userId, conversationId);
    scope = [conversationId];
  } else {
    scope = await conversationIdsOf(userId);
  }
  if (scope.length === 0) return [];

  const messages = await Message.find({
    conversationId: { $in: scope },
    type: { $ne: 'system' },
    status: { $ne: 'deleted' },
    content: new RegExp(escapeRegex(query), 'i'),
  })
    .sort({ sentAt: -1, _id: -1 })
    .limit(50)
    .populate('attachmentId');

  const names = new Map((await listConversations(userId)).map((c) => [c.id, c.name]));
  return messages.map((m) => ({
    message: serialize(m),
    conversationId: String(m.conversationId),
    conversationName: names.get(String(m.conversationId)) || '',
    snippet: snippetOf(m.content, query),
  }));
}

// Escape a value for CSV. Formula-like cells are prefixed with an apostrophe
// to prevent spreadsheet applications from executing them as formulas.
function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

// REQ-HIS-5: export a conversation's complete available history as a CSV
// Chat History Report. Only conversation members may use this function.
async function exportCsv(user, conversationId) {
  await assertMember(user._id, conversationId);

  const conversations = await listConversations(user._id);
  const conversation = conversations.find(
    (item) => item.id === String(conversationId)
  );

  if (!conversation) {
    throw Errors.notFound('Conversation not found');
  }

  const messages = await Message.find({ conversationId })
    .sort({ sentAt: 1, _id: 1 })
    .limit(EXPORT_LIMIT)
    .populate('attachmentId');

  const senderIds = [
    ...new Set(
      messages
        .filter((message) => message.senderId)
        .map((message) => String(message.senderId))
    ),
  ];

  const senders = await User.find({ _id: { $in: senderIds } })
    .select('displayName')
    .lean();

  const senderNames = new Map(
    senders.map((sender) => [String(sender._id), sender.displayName])
  );

  const exportedAt = new Date().toISOString();
  const exportedBy = user.displayName || user.username || '';

  const header = [
    'Conversation Name',
    'Sender Name',
    'Message Content',
    'Sent At',
    'Status',
    'Attachment File Name',
    'Exported By',
    'Export Date',
  ];

  const rows = messages.map((message) => {
    const deleted = message.status === 'deleted';
    const attachment = message.attachmentId;

    return [
      conversation.name,
      message.type === 'system'
        ? 'System'
        : senderNames.get(String(message.senderId)) || 'Deleted user',
      deleted ? 'This message was deleted' : message.content,
      message.sentAt ? new Date(message.sentAt).toISOString() : '',
      message.status,
      !deleted && attachment && attachment.fileName
        ? attachment.fileName
        : '',
      exportedBy,
      exportedAt,
    ];
  });

  const lines = [header, ...rows].map((row) =>
    row.map(csvCell).join(',')
  );

  const safeName = (conversation.name || 'conversation')
    .replace(/[^A-Za-z0-9_-]+/g, '_');

  return {
    fileName: `chat-${safeName}.csv`,
    csv: `\uFEFF${lines.join('\r\n')}\r\n`,
  };
}

module.exports = {
  listConversations,
  getMessages,
  search,
  snippetOf,
  csvCell,
  exportCsv,
  PAGE_SIZE,
  EXPORT_LIMIT,
};
