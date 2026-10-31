// NFR-SEC-5: rejects any request whose body or query contains unsafe keys
// (MongoDB operators like "$ne", dotted keys, "__proto__", or very deep nesting),
// before it can reach a route or a database query.
const { Errors } = require('../utils/errors');
const { findUnsafeKey } = require('../utils/unsafeKeys');

function rejectUnsafeKeys(req, _res, next) {
  for (const part of [req.body, req.query]) {
    const bad = findUnsafeKey(part);
    if (bad) {
      // Report the top-level form field (e.g. "password"), like other validation errors.
      const field = Object.keys(part).find((k) => bad === k || bad.startsWith(`${k}.`)) || bad;
      return next(Errors.validation('Request contains a field name that is not allowed', field));
    }
  }
  return next();
}

module.exports = { rejectUnsafeKeys };
