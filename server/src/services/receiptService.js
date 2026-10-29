// Delivery and read receipts (REQ-RCP-1..5). A message status only moves
// forward: sent -> delivered -> read  (deleted is final, see REQ-MSG-8).
const { Message } = require('../models');
const { isValidId } = require('../utils/ids');
const { isMember, memberUserIds } = require('./membershipService');

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

// Recomputes the overall status after a receipt was added and saves it only
// if it moves forward. Returns { message, changed }.
async function refreshStatus(messageId) {
  const message = await Message.findById(messageId);
  const members = await memberUserIds(message.conversationId);
  const recipientIds = members.filter((id) => id !== String(message.senderId));
  const next = computeStatus({ current: message.status, recipientIds, deliveredTo: message.deliveredTo, readBy: message.readBy });
  if (next === message.status) return { message, changed: false };
  // Conditional update: never overwrite a status that another request already advanced.
  const res = await Message.updateOne({ _id: message._id, status: message.status }, { status: next });
  message.status = next;
  return { message, changed: res.modifiedCount === 1 };
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
// With {conversationId} every unread message from others in it is marked read;
// with {messageId} only that message. Returns the list of status changes.
async function markRead(userId, { messageId, conversationId } = {}) {
  let ids = [];
  if (isValidId(conversationId)) {
    if (!(await isMember(userId, conversationId))) return [];
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

module.exports = { STATUS_RANK, canAdvance, computeStatus, markDelivered, markRead, addReceipt, refreshStatus };
