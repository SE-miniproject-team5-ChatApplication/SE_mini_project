// REQ-AUTH-7 / NFR-SEC-1: every protected REST request must carry a valid,
// unexpired JWT in "Authorization: Bearer <token>".
const { verifyToken } = require('../utils/jwt');
const { Errors } = require('../utils/errors');
const { User } = require('../models');

// The only API routes a guest may call (NFR-SEC-1).
const PUBLIC_ROUTES = [
  ['POST', '/api/auth/register'],
  ['POST', '/api/auth/login'],
  ['GET', '/api/health'],
];

function isPublic(req) {
  const fullPath = (req.baseUrl + req.path).replace(/\/+$/, '');
  return PUBLIC_ROUTES.some(([method, path]) => method === req.method && path === fullPath);
}

async function requireAuth(req, _res, next) {
  if (req.user) return next(); // already checked by the global guard
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw Errors.unauthenticated();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw Errors.unauthenticated('Your session has expired. Please log in again.');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw Errors.unauthenticated();

    req.user = user;
    req.userId = String(user._id);
    req.token = { jti: payload.jti, exp: payload.exp };
    next();
  } catch (err) {
    next(err);
  }
}

function requireAuthExceptPublic(req, res, next) {
  if (req.method === 'OPTIONS' || isPublic(req)) return next();
  return requireAuth(req, res, next);
}

module.exports = { requireAuth, requireAuthExceptPublic, PUBLIC_ROUTES };
