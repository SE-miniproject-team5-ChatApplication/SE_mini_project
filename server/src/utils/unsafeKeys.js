// NFR-SEC-5: NoSQL injection and prototype-pollution guard.
// Client input must never contain object keys that MongoDB or JavaScript treat
// specially: "$ne", "$gt", "a.b", "__proto__", ... Values may contain any text.
const MAX_DEPTH = 10;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

// Returns the path of the first unsafe key (e.g. "password.$ne"), or null.
function findUnsafeKey(value, path = '', depth = 0) {
  if (!value || typeof value !== 'object') return null;
  if (depth > MAX_DEPTH) return path || '(root)';
  for (const [key, child] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key;
    if (key.startsWith('$') || key.includes('.') || FORBIDDEN.has(key)) return here;
    const found = findUnsafeKey(child, here, depth + 1);
    if (found) return found;
  }
  return null;
}

module.exports = { findUnsafeKey, MAX_DEPTH };
