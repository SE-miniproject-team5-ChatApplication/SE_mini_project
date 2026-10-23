// REST authentication (REQ-AUTH-7, NFR-SEC-1).
// Same rules as authenticateSocket in sockets/index.js, for HTTP routes.
// Use it on any route that needs a logged-in user:
//   router.get('/me', requireAuth, handler)   -> handler can read req.user.id
const { User } = require('../models');
const { verifyToken } = require('../utils/jwt');
const { Errors } = require('../utils/errors');

async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(Errors.unauthenticated());

    let payload;
    try {
      payload = verifyToken(token); // fails if tampered, malformed or expired
    } catch {
      return next(Errors.unauthenticated('Invalid or expired token'));
    }

    // The account must still exist
    const user = await User.findById(payload.sub).select('_id username').lean();
    if (!user) return next(Errors.unauthenticated('Invalid or expired token'));

    req.user = { id: String(user._id), username: user.username, jti: payload.jti };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };