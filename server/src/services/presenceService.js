// Presence Service (component C7). Online state is kept in memory (allowed by
// NFR-QA-7: handlers are stateless apart from connection maps).
const { Contact, User } = require('../models');
const { emitToUser } = require('../utils/realtime');

const online = new Set(); // userIds with an open connection

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
  return online.has(String(userId));
}

async function userConnected(userId) {
  online.add(String(userId));
  await broadcast(userId, { status: 'online' });
}

// REQ-PRS-2: remember when the user was last online.
async function userDisconnected(userId) {
  online.delete(String(userId));
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
  online.clear();
}

module.exports = { audienceOf, isOnline, userConnected, userDisconnected, statusOf, reset };
