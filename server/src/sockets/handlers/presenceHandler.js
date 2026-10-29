// Presence and typing events.
//   presence:update {userId, status, lastSeen}  -> to the user's contacts (REQ-PRS-1, -2, -4)
//   typing:start / typing:stop {conversationId} -> relayed as
//   typing:update {conversationId, userId, typing} to the other participants (REQ-PRS-3)
const presenceService = require('../../services/presenceService');
const { isMember } = require('../../services/membershipService');
const { isValidId } = require('../../utils/ids');
const logger = require('../../utils/logger');

function relayTyping(socket, typing) {
  return async (payload) => {
    try {
      const conversationId = payload && payload.conversationId;
      if (!isValidId(conversationId) || !(await isMember(socket.data.userId, conversationId))) return;
      socket.to(`conv:${conversationId}`).emit('typing:update', { conversationId, userId: socket.data.userId, typing });
    } catch (err) {
      logger.error({ err }, 'typing relay failed');
    }
  };
}

function register(_io, socket) {
  socket.on('typing:start', relayTyping(socket, true));
  socket.on('typing:stop', relayTyping(socket, false));
  socket.on('disconnect', () => {
    presenceService.userDisconnected(socket.data.userId).catch((err) => logger.error({ err }, 'presence offline failed'));
  });
}

async function onConnect(_io, socket) {
  await presenceService.userConnected(socket.data.userId);
}

module.exports = { register, onConnect };
