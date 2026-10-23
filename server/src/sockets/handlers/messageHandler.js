// Socket events for messages (SAD 4.3.6).
//   message:send {conversationId, content, clientMsgId}
//     -> acknowledgement callback {ok, clientMsgId, messageId, status, sentAt, message}
//     -> also emits message:ack (or error:event) to the sending socket
const { assertMember } = require('../../services/membershipService');
const messageService = require('../../services/messageService');
const { toErrorBody } = require('../../utils/errors');

function register(_io, socket) {
  socket.on('message:send', async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const { conversationId, content, clientMsgId } = payload || {};
    try {
      await assertMember(socket.data.userId, conversationId);
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
      const { error } = toErrorBody(err);
      socket.emit('error:event', { ...error, event: 'message:send', clientMsgId });
      reply({ ok: false, error });
    }
  });
}

module.exports = { register };
