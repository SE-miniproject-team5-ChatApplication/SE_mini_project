// User search and contacts (DD-PRO). Routes call these; no Express code here.
const mongoose = require('mongoose');
const User = require('../models/User');
const Contact = require('../models/Contact');
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

// REQ-PRO-4: list my contacts (public profile fields only)
async function listContacts(userId) {
  const rows = await Contact.find({ userId }).sort({ createdAt: 1 }).populate('contactUserId');
  return rows.filter((r) => r.contactUserId).map((r) => r.contactUserId.toPublic());
}

// REQ-PRO-4: add a contact; not myself, not twice
async function addContact(userId, contactUserId) {
  if (typeof contactUserId !== 'string' || !mongoose.isValidObjectId(contactUserId)) {
    throw Errors.validation('A valid contactUserId is required', 'contactUserId');
  }
  if (contactUserId === String(userId)) {
    throw Errors.validation('You cannot add yourself as a contact', 'contactUserId');
  }
  const target = await User.findById(contactUserId);
  if (!target) throw Errors.notFound('User not found');

  try {
    await Contact.create({ userId, contactUserId });
  } catch (err) {
    if (err.code === 11000) throw Errors.conflict('This user is already in your contacts', 'contactUserId');
    throw err;
  }
  return target.toPublic();
}

// REQ-PRO-4: remove a contact
async function removeContact(userId, contactUserId) {
  if (!mongoose.isValidObjectId(contactUserId)) throw Errors.notFound('This user is not in your contacts');
  const { deletedCount } = await Contact.deleteOne({ userId, contactUserId });
  if (!deletedCount) throw Errors.notFound('This user is not in your contacts');
}


// Check whether a user has added the other user to their contacts.
async function isContact(userId, contactUserId) {
  return Boolean(await Contact.exists({ userId, contactUserId }));
}
module.exports = { searchUsers, listContacts, addContact, removeContact, isContact, SEARCH_LIMIT };
