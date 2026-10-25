// User Service (component C5): profile, user search, contacts.
const { User, Contact } = require('../models');
const { Errors } = require('../utils/errors');
const { assertId } = require('../utils/ids');

// Escapes characters that have a special meaning in regular expressions, so a
// search for "a.b" or "(" is treated as plain text (also blocks ReDoS input).
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// REQ-PRO-3: partial, case-insensitive search by username or display name.
async function searchUsers(query, currentUserId) {
  const q = typeof query === 'string' ? query.trim() : '';
  if (q.length < 2) throw Errors.validation('Type at least 2 characters to search', 'q');
  if (q.length > 40) throw Errors.validation('Search text is too long', 'q');
  const pattern = new RegExp(escapeRegex(q), 'i');
  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ username: pattern }, { displayName: pattern }],
  })
    .sort({ username: 1 })
    .limit(20);
  return users.map((u) => u.toPublic());
}

// REQ-PRO-4: contact list ------------------------------------------------------

async function listContacts(userId) {
  const contacts = await Contact.find({ userId }).populate('contactUserId').sort({ createdAt: 1 });
  return contacts.filter((c) => c.contactUserId).map((c) => c.contactUserId.toPublic());
}

async function addContact(userId, contactUserId) {
  assertId(contactUserId, 'contactUserId');
  if (String(userId) === contactUserId) throw Errors.validation('You cannot add yourself as a contact', 'contactUserId');
  const other = await User.findById(contactUserId);
  if (!other) throw Errors.notFound('User not found');
  try {
    await Contact.create({ userId, contactUserId });
  } catch (err) {
    if (err.code === 11000) throw Errors.conflict('This user is already in your contacts', 'contactUserId');
    throw err;
  }
  return other.toPublic();
}

async function removeContact(userId, contactUserId) {
  assertId(contactUserId, 'contactUserId');
  const result = await Contact.deleteOne({ userId, contactUserId });
  if (result.deletedCount === 0) throw Errors.notFound('This user is not in your contacts');
}

async function isContact(userId, otherUserId) {
  return Boolean(await Contact.exists({ userId, contactUserId: otherUserId }));
}

module.exports = { escapeRegex, searchUsers, listContacts, addContact, removeContact, isContact };
