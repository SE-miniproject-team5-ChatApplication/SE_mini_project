// Issues and verifies JSON Web Tokens (ADR-3: one stateless token for both
// REST and the WebSocket handshake). Every token has a unique id (jti) so a
// single session can be revoked on logout.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;

function signToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: String(user._id || user.id), username: user.username }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
    jwtid: jti,
  });
  return { token, jti, expiresIn: TOKEN_LIFETIME_SECONDS };
}

// Throws if the token is missing, malformed, tampered with or expired.
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken, TOKEN_LIFETIME_SECONDS };
