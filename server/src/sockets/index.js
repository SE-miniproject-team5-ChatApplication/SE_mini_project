// Socket Gateway (component C3).
// 1. Authenticates the handshake with the JWT (REQ-AUTH-7).
// 2. Puts each socket in room user:<id> and in conv:<id> for each conversation.
// 3. Loads every handler in ./handlers. A handler module may export:
//      init(io)               - once, when the server starts
//      register(io, socket)   - for each socket, to add event listeners
//      onConnect(io, socket)  - for each socket, after its rooms are joined
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const config = require('../config');
const logger = require('../utils/logger');
const { verifyToken } = require('../utils/jwt');
const { setIO } = require('../utils/realtime');
const { User, Member, RevokedToken } = require('../models');

function loadHandlers() {
  const dir = path.join(__dirname, 'handlers');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((f) => require(path.join(dir, f)));
}

function unauthenticated() {
  const err = new Error('UNAUTHENTICATED');
  err.data = { code: 'UNAUTHENTICATED', message: 'A valid token is required' };
  return err;
}

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token || typeof token !== 'string') return next(unauthenticated());
    const payload = verifyToken(token);
    if (payload.jti && (await RevokedToken.exists({ jti: payload.jti }))) return next(unauthenticated());
    const user = await User.findById(payload.sub).select('_id username').lean();
    if (!user) return next(unauthenticated());
    socket.data.userId = String(user._id);
    socket.data.username = user.username;
    socket.data.jti = payload.jti;
    return next();
  } catch {
    return next(unauthenticated());
  }
}

function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigin },
    // SRS 3.3: heartbeat every 25 s; a connection silent for 60 s is closed.
    pingInterval: 25000,
    pingTimeout: 35000,
  });
  setIO(io);
  io.use(authenticateSocket);

  const handlers = loadHandlers();
  handlers.forEach((h) => h.init && h.init(io));

  io.on('connection', async (socket) => {
    const { userId } = socket.data;
    handlers.forEach((h) => h.register && h.register(io, socket));
    try {
      socket.join(`user:${userId}`);
      const memberships = await Member.find({ userId }).select('conversationId').lean();
      memberships.forEach((m) => socket.join(`conv:${m.conversationId}`));
      for (const h of handlers) {
        if (h.onConnect) await h.onConnect(io, socket);
      }
      socket.emit('session:ready', { userId });
    } catch (err) {
      logger.error({ err, userId }, 'socket setup failed');
    }
  });

  return io;
}

module.exports = { attachSockets, authenticateSocket };
