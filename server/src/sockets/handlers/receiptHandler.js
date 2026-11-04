// Receipt events (SAD 4.3.6).
//   message:delivered {messageId} - the recipient's client received the message (REQ-RCP-2)
//   message:read {conversationId} or {messageId} - shown on screen in the open conversation (REQ-RCP-3)
//   receipt:update {messageId, conversationId, status, userId} - pushed to the sender (REQ-RCP-4)
const receiptService = require('../../services/receiptService');
const logger = require('../../utils/logger');

const { pushChanges } = receiptService;

function register(_io, socket) {
  const { userId } = socket.data;

  socket.on('message:delivered', async (payload) => {
    try {
      const result = await receiptService.markDelivered(userId, payload && payload.messageId);
      pushChanges([result], userId);
    } catch (err) {
      logger.error({ err, event: 'message:delivered' }, 'receipt failed');
    }
  });

  socket.on('message:read', async (payload) => {
    try {
      pushChanges(await receiptService.markRead(userId, payload || {}), userId);
    } catch (err) {
      logger.error({ err, event: 'message:read' }, 'receipt failed');
    }
  });
}

module.exports = { register, pushChanges };
