// Messaging Service (component C6).
const { Message, Conversation } = require('../models');
const { MAX_CONTENT_LENGTH } = require('../models/Message');
const { Errors } = require('../utils/errors');
const { sanitizeText } = require('../middleware/sanitize');

// REQ-MSG-4 / BR-5: no empty messages, at most 2000 characters.
function validateContent(content) {
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw Errors.validation('Message cannot be empty', 'content');
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw Errors.validation(`Message is too long (maximum ${MAX_CONTENT_LENGTH} characters)`, 'content');
  }
}

function previewOf(message) {
  if (message.status === 'deleted') return 'This message was deleted';
  return (message.content || '').slice(0, 120);
}

// Plain object sent to clients.
function serialize(message) {
  const json = message.toJSON ? message.toJSON() : { ...message };
  json.conversationId = String(json.conversationId);
  json.senderId = json.senderId ? String(json.senderId) : null;
  if (json.attachmentId) json.attachmentId = String(json.attachmentId);
  return json;
}

// REQ-MSG-1: store a text message sent by a member of the conversation.
// REQ-MSG-3 / NFR-SAFE-1: this function resolves only after MongoDB has
// confirmed the insert, and callers send the acknowledgement only after it
// resolves - so an acknowledged message is always in the database.
async function createMessage({ conversationId, senderId, content: rawContent, clientMsgId }) {
  const content = sanitizeText(rawContent);
  validateContent(content);
  const message = await Message.create({
    conversationId,
    senderId,
    type: 'text',
    content,
    clientMsgId: typeof clientMsgId === 'string' ? clientMsgId.slice(0, 64) : undefined,
    sentAt: new Date(),
  });
  await Conversation.updateOne(
    { _id: conversationId },
    {
      lastMessage: { messageId: message._id, senderId, preview: previewOf(message), type: message.type, sentAt: message.sentAt },
      lastMessageAt: message.sentAt,
    }
  );
  return message;
}

module.exports = { createMessage, serialize, previewOf, validateContent };
