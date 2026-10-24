// Messaging Service (component C6).
const { Message, Conversation } = require('../models');
const { Errors } = require('../utils/errors');

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
async function createMessage({ conversationId, senderId, content, clientMsgId }) {
  if (typeof content !== 'string') throw Errors.validation('Message text is required', 'content');
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

module.exports = { createMessage, serialize, previewOf };
