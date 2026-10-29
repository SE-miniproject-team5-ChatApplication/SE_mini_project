// Socket events for messages (SAD 4.3.6).
//   message:send {conversationId, content, clientMsgId, attachmentId?}
//     -> acknowledgement callback {ok, clientMsgId, messageId, status, sentAt, message}
//     -> also emits message:ack (or error:event) to the sending socket
//   message:new  (server -> every other socket in room conv:<id>)
//   On connect, messages that arrived while the user was offline are sent as message:new.
const { assertMember } = require('../../services/membershipService');
const messageService = require('../../services/messageService');
const { AppError, toErrorBody } = require('../../utils/errors');
const logger = require('../../utils/logger');
const bus = require('../../utils/eventBus');
const { createSerialQueue } = require('../../utils/serialQueue');

async function handleSend(socket, payload, ack) {
  const reply = typeof ack === 'function' ? ack : () => {};
  const { conversationId, content, clientMsgId, attachmentId } = payload || {};
  try {
    await assertMember(socket.data.userId, conversationId);
    // REQ-MSG-3: persist first; nothing below runs if the write fails.
    const message = await messageService.createMessage({
      conversationId,
      senderId: socket.data.userId,
      content,
      clientMsgId,
      attachmentId,
    });
    const data = { clientMsgId, messageId: String(message._id), status: message.status, sentAt: message.sentAt };
    const serialized = messageService.serialize(message);
    socket.emit('message:ack', data);
    reply({ ok: true, ...data, message: serialized });
    // REQ-MSG-7: a resent message that was already stored is acknowledged again
    // but not broadcast a second time.
    if (message.isDuplicate) return;
    // REQ-MSG-2: real-time delivery to the recipient's open connection(s)
    // (and to the sender's other tabs). Offline users get it later (REQ-MSG-6).
    socket.to(`conv:${conversationId}`).emit('message:new', serialized);
    bus.emit('message:created', { message: serialized });
  } catch (err) {
    if (!(err instanceof AppError)) logger.error({ err, event: 'message:send' }, 'message not stored');
    const { error } = toErrorBody(err);
    socket.emit('error:event', { ...error, event: 'message:send', clientMsgId });
    reply({ ok: false, error });
  }
}

function register(_io, socket) {
  // REQ-MSG-5: one queue per connection keeps this sender's messages in order,
  // even when several are sent faster than the database answers.
  const queue = createSerialQueue();
  socket.on('message:send', (payload, ack) => queue(() => handleSend(socket, payload, ack)));
}

// REQ-MSG-6: deliver stored messages automatically when the recipient reconnects.
// The client acknowledges each one with message:delivered, so it is sent only once.
async function onConnect(_io, socket) {
  const pending = await messageService.pendingFor(socket.data.userId);
  pending.forEach((m) => socket.emit('message:new', m));
}

module.exports = { register, onConnect };
