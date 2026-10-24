// Socket events for messages (SAD 4.3.6).
//   message:send {conversationId, content, clientMsgId}
//     -> acknowledgement callback {ok, clientMsgId, messageId, status, sentAt, message}
//     -> also emits message:ack (or error:event) to the sending socket
const { assertMember } = require('../../services/membershipService');
const messageService = require('../../services/messageService');
const { AppError, toErrorBody } = require('../../utils/errors');
const logger = require('../../utils/logger');

function register(_io, socket) {
  socket.on('message:send', async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const { conversationId, content, clientMsgId } = payload || {};
    try {
      await assertMember(socket.data.userId, conversationId);
      // REQ-MSG-3: persist first; nothing below runs if the write fails.
      const message = await messageService.createMessage({
        conversationId,
        senderId: socket.data.userId,
        content,
        clientMsgId,
      });
      const data = { clientMsgId, messageId: String(message._id), status: message.status, sentAt: message.sentAt };
      socket.emit('message:ack', data);
      reply({ ok: true, ...data, message: messageService.serialize(message) });
    } catch (err) {
      if (!(err instanceof AppError)) logger.error({ err, event: 'message:send' }, 'message not stored');
      const { error } = toErrorBody(err);
      socket.emit('error:event', { ...error, event: 'message:send', clientMsgId });
      reply({ ok: false, error });
    }
  });
}

module.exports = { register };
