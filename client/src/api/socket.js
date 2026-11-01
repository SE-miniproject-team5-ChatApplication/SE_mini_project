// Socket.IO client (WebSocket transport). The JWT goes in the handshake "auth"
// field (SRS 3.3). Socket.IO reconnects automatically after a network drop.
import { io } from 'socket.io-client';

export function createSocket(token) {
  return io({
    auth: { token },
    transports: ['websocket'],
    // NFR-QA-2: keep trying for ever, so a drop of 60 s or more recovers on its own.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
}
