// Receipt events (SAD 4.3.6).
//   message:delivered {messageId} - the recipient's client received the message (REQ-RCP-2)
//   message:read {conversationId} or {messageId} - shown on screen in the open conversation (REQ-RCP-3)
const receiptService = require('../../services/receiptService');
const logger = require('../../utils/logger');

function register(_io, socket) {
  socket.on('message:delivered', async (payload) => {
    try {
      await receiptService.markDelivered(socket.data.userId, payload && payload.messageId);
    } catch (err) {
      logger.error({ err, event: 'message:delivered' }, 'receipt failed');
    }
  });

  socket.on('message:read', async (payload) => {
    try {
      await receiptService.markRead(socket.data.userId, payload || {});
    } catch (err) {
      logger.error({ err, event: 'message:read' }, 'receipt failed');
    }
  });
}

module.exports = { register };
