// Socket.IO client (WebSocket transport). The JWT goes in the handshake "auth"
// field (SRS 3.3). Socket.IO reconnects automatically after a network drop.
import { io } from 'socket.io-client';

export function createSocket(token) {
  return io({
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
}
