// User profile and search (DD-PRO). Routes call these; no Express code here.
const User = require('../models/User');
const { Errors } = require('../utils/errors');

const SEARCH_LIMIT = 20;

// Treat the search text as plain text, not as a regex pattern (NFR-SEC-5)
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// REQ-PRO-3: partial, case-insensitive search on username or display name
async function searchUsers(currentUserId, q) {
  if (typeof q !== 'string' || q.trim().length < 2 || q.length > 50) {
    throw Errors.validation('Search text must be 2-50 characters', 'q');
  }
  const pattern = new RegExp(escapeRegex(q.trim()), 'i');
  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ username: pattern }, { displayName: pattern }],
  })
    .select('username displayName')
    .sort({ username: 1 })
    .limit(SEARCH_LIMIT)
    .lean();

  return users.map((u) => ({ userId: String(u._id), username: u.username, displayName: u.displayName }));
}

module.exports = { searchUsers, SEARCH_LIMIT };