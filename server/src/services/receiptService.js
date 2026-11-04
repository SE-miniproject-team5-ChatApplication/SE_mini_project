
// Receipt Service (REQ-RCP-1..5).
// Owns message delivery/read receipts and message status transitions.
// Unread-count operations are delegated to the DD-NOT Notification Service.

const { Message, User } = require('../models');
const { Errors } = require('../utils/errors');
const { isValidId } = require('../utils/ids');
const { emitToUser } = require('../utils/realtime');
const { isMember, memberUserIds } = require('./membershipService');
const notificationService = require('./notificationService');

const STATUS_RANK = { sent: 0, delivered: 1, read: 2, deleted: 3 };

function canAdvance(from, to) {
  return STATUS_RANK[to] !== undefined && STATUS_RANK[to] > STATUS_RANK[from];
}

// Works for direct chats (one recipient) and groups (many recipients):
// "delivered" when every recipient's client has it, "read" when every recipient read it.
function computeStatus({ current, recipientIds, deliveredTo = [], readBy = [] }) {
  if (current === 'deleted') return 'deleted';

  const read = new Set(readBy.map((r) => String(r.userId)));
  const delivered = new Set([...deliveredTo.map((r) => String(r.userId)), ...read]);
  const recipients = recipientIds.map(String);

  let next = 'sent';
  if (recipients.length > 0 && recipients.every((id) => read.has(id))) next = 'read';
  else if (recipients.length > 0 && recipients.every((id) => delivered.has(id))) next = 'delivered';

  return canAdvance(current, next) ? next : current;
}

// Recomputes the overall status from the current members and saves it only
// if it moves forward. Returns { message, changed }.
async function saveStatus(message, members) {
  const recipientIds = members.filter((id) => id !== String(message.senderId));

  const next = computeStatus({
    current: message.status,
    recipientIds,
    deliveredTo: message.deliveredTo,
    readBy: message.readBy,
  });

  if (next === message.status) return { message, changed: false };

  // Conditional update: never overwrite a status that another request advanced.
  const res = await Message.updateOne(
    { _id: message._id, status: message.status },
    { status: next }
  );

  message.status = next;
  return { message, changed: res.modifiedCount === 1 };
}

// After a receipt was added.
async function refreshStatus(messageId) {
  const message = await Message.findById(messageId);
  return saveStatus(message, await memberUserIds(message.conversationId));
}

// REQ-RCP-5: "all current members" changes when someone leaves or is removed,
// so the messages that are not yet read are checked again. Returns the changes.
async function refreshConversation(conversationId) {
  const members = await memberUserIds(conversationId);
  const pending = await Message.find({
    conversationId,
    type: { $ne: 'system' },
    status: { $in: ['sent', 'delivered'] },
  })
    .sort({ sentAt: -1 })
    .limit(500);

  const results = [];
  for (const message of pending) results.push(await saveStatus(message, members));
  return results.filter((r) => r.changed);
}

// REQ-RCP-4: every status change reaches the sender immediately (no refresh).
function pushChanges(results, byUserId) {
  for (const r of results) {
    if (!r || !r.changed) continue;
    emitToUser(r.message.senderId, 'receipt:update', {
      messageId: String(r.message._id),
      conversationId: String(r.message.conversationId),
      status: r.message.status,
      userId: byUserId,
    });
  }
}

// Adds userId to message[field] once. Only conversation members who are not
// the sender can add receipts. Returns null when nothing changed.
async function addReceipt(field, userId, messageId) {
  if (!isValidId(messageId)) return null;

  const message = await Message.findById(messageId).select('senderId conversationId type status');
  if (!message || message.type === 'system' || message.status === 'deleted') return null;
  if (String(message.senderId) === String(userId)) return null;
  if (!(await isMember(userId, message.conversationId))) return null;

  const res = await Message.updateOne(
    { _id: messageId, [`${field}.userId`]: { $ne: userId } },
    { $push: { [field]: { userId, at: new Date() } } }
  );

  if (res.modifiedCount === 0) return null;
  return refreshStatus(messageId);
}

// REQ-RCP-2: the recipient's client acknowledged receipt.
function markDelivered(userId, messageId) {
  return addReceipt('deliveredTo', userId, messageId);
}

// REQ-RCP-3: the recipient has the conversation open and the message is shown.
// DD-NOT: unread-count reset is delegated to notificationService.
// With {conversationId} every unread message from others in it is marked read;
// with {messageId} only that message.
async function markRead(userId, { messageId, conversationId } = {}) {
  let ids = [];

  if (isValidId(conversationId)) {
    if (!(await isMember(userId, conversationId))) return [];

    // DD-NOT: reset this member's unread counter through the Notification Service.
    await notificationService.resetUnreadCount(userId, conversationId);

    const unread = await Message.find({
      conversationId,
      senderId: { $ne: userId },
      type: { $ne: 'system' },
      status: { $ne: 'deleted' },
      'readBy.userId': { $ne: userId },
    })
      .sort({ sentAt: 1 })
      .limit(500)
      .select('_id')
      .lean();

    ids = unread.map((m) => m._id);
  } else if (isValidId(messageId)) {
    ids = [messageId];
  }

  const results = [];
  for (const id of ids) {
    const r = await addReceipt('readBy', userId, String(id));
    if (r) results.push(r);
  }

  return results;
}

// REQ-RCP-5: the sender can see the status for each current member.
async function receiptsFor(userId, messageId) {
  if (!isValidId(messageId)) throw Errors.validation('Invalid messageId', 'messageId');
  const message = await Message.findById(messageId);
  if (!message) throw Errors.notFound('Message not found');
  if (String(message.senderId) !== String(userId)) throw Errors.forbidden('Only the sender can see receipts');

  const memberIds = (await memberUserIds(message.conversationId)).filter((id) => id !== String(userId));
  const users = await User.find({ _id: { $in: memberIds } }).select('displayName');
  const nameOf = new Map(users.map((u) => [String(u._id), u.displayName]));
  const at = (list, id) => (list.find((r) => String(r.userId) === id) || {}).at || null;

  return {
    messageId: String(message._id),
    status: message.status,
    members: memberIds.map((id) => {
      const readAt = at(message.readBy, id);
      const deliveredAt = at(message.deliveredTo, id) || readAt;
      return {
        userId: id,
        displayName: nameOf.get(id) || 'Unknown',
        deliveredAt,
        readAt,
        status: readAt ? 'read' : deliveredAt ? 'delivered' : 'sent',
      };
    }),
  };
}

module.exports = {
  STATUS_RANK,
  canAdvance,
  computeStatus,
  markDelivered,
  markRead,
  addReceipt,
  refreshStatus,
  refreshConversation,
  pushChanges,
  receiptsFor,
};
