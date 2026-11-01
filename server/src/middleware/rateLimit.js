// NFR-SEC-6: at most 100 REST requests per minute per IP address, and at most
// 20 messages per 10 seconds per user over the WebSocket.
const { rateLimit } = require('express-rate-limit');
const { Errors } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

const REST_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE) || 100;
const REST_WINDOW_MS = 60 * 1000;
const MESSAGE_LIMIT = 20;
const MESSAGE_WINDOW_MS = 10 * 1000;

// During local development every browser on the laptop reaches the server
// through the Vite proxy as 127.0.0.1, so they would all share one limit and a
// two-user demo could hit it. Only in development, local requests are not limited.
function isLocalDevRequest(req) {
  return config.env === 'development' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip);
}

function createRestLimiter({ limit = REST_LIMIT, windowMs = REST_WINDOW_MS } = {}) {
  return rateLimit({
    windowMs,
    limit,
    skip: isLocalDevRequest,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, _res, next) => next(Errors.rateLimited('Too many requests. Please wait a minute and try again.')),
  });
}

// Sliding window per user: remembers the times of the last messages.
function createMessageLimiter({ limit = MESSAGE_LIMIT, windowMs = MESSAGE_WINDOW_MS } = {}) {
  const sent = new Map(); // userId -> [timestamps]
  return function allow(userId, now = Date.now()) {
    const recent = (sent.get(userId) || []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      sent.set(userId, recent);
      return false;
    }
    recent.push(now);
    sent.set(userId, recent);
    return true;
  };
}

// Socket.IO middleware: drops message:send events over the limit.
function socketRateLimit(socket, allow) {
  return (packet, next) => {
    if (packet[0] !== 'message:send') return next();
    if (allow(socket.data.userId)) return next();
    const ack = typeof packet[packet.length - 1] === 'function' ? packet[packet.length - 1] : null;
    const error = { code: 'RATE_LIMITED', message: 'You are sending messages too fast. Please slow down.' };
    logger.warn({ userId: socket.data.userId }, 'socket rate limit hit');
    socket.emit('error:event', { ...error, event: 'message:send' });
    if (ack) ack({ ok: false, error });
    return undefined;
  };
}

module.exports = { createRestLimiter, createMessageLimiter, socketRateLimit, REST_LIMIT, MESSAGE_LIMIT };
