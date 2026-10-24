// Presence Service (component C7). Online state is kept in memory (allowed by
// NFR-QA-7: handlers are stateless apart from connection maps).
const { Contact, User } = require('../models');
const { emitToUser } = require('../utils/realtime');

// REQ-PRS-4: userId -> number of open connections (tabs/devices).
// A user is online while this count is above zero.
const sessions = new Map();

// Who should hear about this user's presence: people who have them as a
// contact, and the user's own contacts (REQ-PRS-1).
async function audienceOf(userId) {
  const [followers, contacts] = await Promise.all([
    Contact.find({ contactUserId: userId }).distinct('userId'),
    Contact.find({ userId }).distinct('contactUserId'),
  ]);
  return [...new Set([...followers, ...contacts].map(String))];
}

async function broadcast(userId, update) {
  const audience = await audienceOf(userId);
  audience.forEach((id) => emitToUser(id, 'presence:update', { userId: String(userId), ...update }));
}

function isOnline(userId) {
  return sessions.has(String(userId));
}

function sessionCount(userId) {
  return sessions.get(String(userId)) || 0;
}

// Broadcast "online" only for the first connection.
async function userConnected(userId) {
  const key = String(userId);
  const count = sessionCount(key) + 1;
  sessions.set(key, count);
  if (count === 1) await broadcast(userId, { status: 'online' });
}

// Broadcast "offline" only when the last connection closes.
// REQ-PRS-2: remember when the user was last online.
async function userDisconnected(userId) {
  const key = String(userId);
  const count = sessionCount(key) - 1;
  if (count > 0) {
    sessions.set(key, count);
    return;
  }
  sessions.delete(key);
  const lastSeen = new Date();
  await User.updateOne({ _id: userId }, { lastSeen });
  await broadcast(userId, { status: 'offline', lastSeen });
}

async function statusOf(userIds) {
  const users = await User.find({ _id: { $in: userIds } }).select('lastSeen').lean();
  const lastSeen = new Map(users.map((u) => [String(u._id), u.lastSeen]));
  return userIds.map((id) => ({
    userId: String(id),
    status: isOnline(id) ? 'online' : 'offline',
    lastSeen: lastSeen.get(String(id)) || null,
  }));
}

// Test helper: forget all in-memory state.
function reset() {
  sessions.clear();
}

module.exports = { audienceOf, isOnline, sessionCount, userConnected, userDisconnected, statusOf, reset };
