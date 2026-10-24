// Presence events (REQ-PRS-1): presence:update {userId, status, lastSeen}
// is pushed to a user's contacts when the user connects or disconnects.
const presenceService = require('../../services/presenceService');
const logger = require('../../utils/logger');

function register(_io, socket) {
  socket.on('disconnect', () => {
    presenceService.userDisconnected(socket.data.userId).catch((err) => logger.error({ err }, 'presence offline failed'));
  });
}

async function onConnect(_io, socket) {
  await presenceService.userConnected(socket.data.userId);
}

module.exports = { register, onConnect };
