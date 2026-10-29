// Messaging Service (component C6).
const { Message, Conversation, Attachment, Member } = require('../models');
const { MAX_CONTENT_LENGTH } = require('../models/Message');
const { Errors } = require('../utils/errors');
const { sanitizeText } = require('../middleware/sanitize');
const { isValidId } = require('../utils/ids');

// REQ-MSG-4 / BR-5: no empty messages, at most 2000 characters.
// A message with an attachment may have no text (Appendix B.2).
function validateContent(content, { hasAttachment = false } = {}) {
  if (hasAttachment && (content === undefined || content === null || content === '')) return;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw Errors.validation('Message cannot be empty', 'content');
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw Errors.validation(`Message is too long (maximum ${MAX_CONTENT_LENGTH} characters)`, 'content');
  }
}

function previewOf(message, attachment) {
  if (message.status === 'deleted') return 'This message was deleted';
  if (!message.content && attachment) return `📎 ${attachment.fileName}`.slice(0, 120);
  return (message.content || '').slice(0, 120);
}

// Plain object sent to clients. If the attachment was loaded (populate), its
// public details are included as message.attachment.
function serialize(message) {
  const json = message.toJSON ? message.toJSON() : { ...message };
  json.conversationId = String(json.conversationId);
  json.senderId = json.senderId ? String(json.senderId) : null;
  const att = json.attachmentId;
  if (att && typeof att === 'object' && att.fileName) {
    json.attachment = { id: String(att.id || att._id), fileName: att.fileName, mimeType: att.mimeType, size: att.size, url: `/api/files/${att.id || att._id}` };
    json.attachmentId = json.attachment.id;
  } else if (att) {
    json.attachmentId = String(att);
  }
  if (json.status === 'deleted') delete json.attachment;
  return json;
}

// The attachment must have been uploaded by the sender into this conversation.
async function findOwnAttachment(attachmentId, senderId, conversationId) {
  if (attachmentId === undefined || attachmentId === null) return null;
  const attachment = await Attachment.findOne({ _id: String(attachmentId), uploaderId: senderId, conversationId }).catch(() => null);
  if (!attachment) throw Errors.validation('Attachment not found', 'attachmentId');
  return attachment;
}

// REQ-MSG-1: store a text message sent by a member of the conversation.
// REQ-MSG-3 / NFR-SAFE-1: this function resolves only after MongoDB has
// confirmed the insert, and callers send the acknowledgement only after it
// resolves - so an acknowledged message is always in the database.
async function createMessage({ conversationId, senderId, content: rawContent, clientMsgId, attachmentId }) {
  // REQ-MSG-7: a resend of a message we already stored returns the stored copy
  // instead of creating a duplicate.
  const existing = await findByClientMsgId(senderId, clientMsgId);
  if (existing) return existing;

  const content = sanitizeText(rawContent);
  const attachment = await findOwnAttachment(attachmentId, senderId, conversationId);
  validateContent(content, { hasAttachment: Boolean(attachment) });
  let message;
  try {
    message = await Message.create({
      conversationId,
      senderId,
      type: attachment ? 'file' : 'text',
      content: content || '',
      attachmentId: attachment ? attachment._id : null,
      clientMsgId: typeof clientMsgId === 'string' ? clientMsgId.slice(0, 64) : undefined,
      sentAt: new Date(),
    });
  } catch (err) {
    // Two copies of the same resend arrived at the same moment: the unique index kept one.
    if (err.code === 11000) {
      const dup = await findByClientMsgId(senderId, clientMsgId);
      if (dup) return dup;
    }
    throw err;
  }
  await Conversation.updateOne(
    { _id: conversationId },
    {
      lastMessage: { messageId: message._id, senderId, preview: previewOf(message, attachment), type: message.type, sentAt: message.sentAt },
      lastMessageAt: message.sentAt,
    }
  );
  if (attachment) message.attachmentId = attachment; // so serialize() includes its details
  return message;
}

// REQ-MSG-8 / BR-4: a sender may delete only their own message. The record is
// kept for audit; its content is hidden from everyone ("This message was deleted").
async function deleteMessage(userId, messageId) {
  if (!isValidId(messageId)) throw Errors.validation('Invalid messageId', 'messageId');
  const message = await Message.findById(messageId);
  if (!message) throw Errors.notFound('Message not found');
  if (!message.senderId || String(message.senderId) !== String(userId)) {
    throw Errors.forbidden('You can only delete your own messages');
  }
  if (message.status !== 'deleted') {
    message.status = 'deleted';
    message.deletedAt = new Date();
    await message.save();
    await Conversation.updateOne(
      { _id: message.conversationId, 'lastMessage.messageId': message._id },
      { 'lastMessage.preview': previewOf(message) }
    );
  }
  return message;
}

async function findByClientMsgId(senderId, clientMsgId) {
  if (typeof clientMsgId !== 'string' || !clientMsgId) return null;
  const found = await Message.findOne({ senderId, clientMsgId: clientMsgId.slice(0, 64) }).populate('attachmentId');
  if (found) found.isDuplicate = true;
  return found;
}

// REQ-MSG-6: messages that reached the server while this user was offline -
// not yet delivered to them, not deleted, sent after they joined - oldest first.
async function pendingFor(userId, limit = 500) {
  const memberships = await Member.find({ userId }).select('conversationId joinedAt').lean();
  if (memberships.length === 0) return [];
  const messages = await Message.find({
    $or: memberships.map((m) => ({ conversationId: m.conversationId, sentAt: { $gte: m.joinedAt } })),
    senderId: { $ne: null, $nin: [userId] },
    type: { $ne: 'system' },
    status: { $ne: 'deleted' },
    'deliveredTo.userId': { $ne: userId },
    'readBy.userId': { $ne: userId },
  })
    .sort({ sentAt: 1, _id: 1 })
    .limit(limit)
    .populate('attachmentId');
  return messages.map(serialize);
}

module.exports = { createMessage, deleteMessage, serialize, previewOf, validateContent, pendingFor };
