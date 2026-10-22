// socket.io-client helpers for tests. Uses event-based waits, never fixed
// sleeps (Test Plan risk: flaky real-time tests).
const { io: ioClient } = require('socket.io-client');

function connectClient(url, token, opts = {}) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false, ...opts });
    socket.once('session:ready', () => resolve(socket));
    socket.once('connect_error', (err) => {
      socket.close();
      reject(err);
    });
  });
}

function waitFor(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// Emits an event and waits for the Socket.IO acknowledgement callback.
function emitAck(socket, event, payload, timeoutMs = 3000) {
  return socket.timeout(timeoutMs).emitWithAck(event, payload);
}

module.exports = { connectClient, waitFor, emitAck };
