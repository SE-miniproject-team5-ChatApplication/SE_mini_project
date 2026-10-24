// NFR-SAFE-2 (XSS protection), server side.
// - Text is stored exactly as typed (minus invisible control characters) and is
//   always sent as JSON. The React client renders it as text, never as HTML,
//   so "<script>" in a message is displayed, not executed.
// - Control characters (e.g. NUL) are removed because they can break logs,
//   CSV exports and some browsers.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(CONTROL_CHARS, '').normalize('NFC');
}

// Password fields are left untouched so a user's password is never changed.
function sanitizeValue(value, key = '') {
  if (typeof value === 'string') return /password/i.test(key) ? value : sanitizeText(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeValue(v, k);
    return out;
  }
  return value;
}

function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
  next();
}

module.exports = { sanitizeText, sanitizeValue, sanitizeBody };
