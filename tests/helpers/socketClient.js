
const { io } = require('socket.io-client');

function createSocketClient(url, options = {}) {
  return io(url, {
    autoConnect: false,
    reconnection: false,
    ...options,
  });
}

module.exports = { createSocketClient };
