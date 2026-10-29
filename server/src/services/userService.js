// User Service (component C5): profile, user search, contacts.
const { User, Contact } = require('../models');
const { Errors } = require('../utils/errors');
const { assertId } = require('../utils/ids');
const { hashPassword, verifyPassword, validatePassword } = require('./authService');
const fileStorage = require('./fileStorage');

// REQ-PRO-2: avatar limits
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

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

// REQ-PRO-1: edit my display name and/or status message.
// Only these two fields can be changed here; username and email are ignored.
async function updateProfile(user, body = {}) {
  const { displayName, statusMessage } = body;
  if (displayName === undefined && statusMessage === undefined) {
    throw Errors.validation('Nothing to update: send displayName and/or statusMessage');
  }

  if (displayName !== undefined) {
    if (typeof displayName !== 'string') {
      throw Errors.validation('Display name must be text', 'displayName');
    }
    const name = displayName.trim();
    if (name.length < 1 || name.length > 40) {
      throw Errors.validation('Display name must be 1-40 characters', 'displayName');
    }
    user.displayName = name;
  }

  if (statusMessage !== undefined) {
    if (typeof statusMessage !== 'string') {
      throw Errors.validation('Status message must be text', 'statusMessage');
    }
    const status = statusMessage.trim();
    if (status.length > 100) {
      throw Errors.validation('Status message can be at most 100 characters', 'statusMessage');
    }
    user.statusMessage = status;
  }

  await user.save();
  return user;
}

// REQ-PRO-5: change my password after giving the current one.
// The new password must follow the REQ-AUTH-1 rule.
async function changePassword(userId, body = {}) {
  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== 'string' || !currentPassword) {
    throw Errors.validation('Enter your current password', 'currentPassword');
  }
  validatePassword(newPassword, 'newPassword');
  if (newPassword === currentPassword) {
    throw Errors.validation('New password must be different from the current one', 'newPassword');
  }

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw Errors.notFound('User not found');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw Errors.forbidden('Current password is incorrect');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}

// REQ-PRO-2: work out the real image type from the file's first bytes,
// never from the file name or the type the browser claims.
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mimeType: 'image/jpeg' };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= 8 && png.every((byte, i) => buffer[i] === byte)) {
    return { ext: '.png', mimeType: 'image/png' };
  }
  return null;
}

// REQ-PRO-2: JPG or PNG up to 2 MB; replaces (and deletes) the old avatar.
async function setAvatar(user, file) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw Errors.validation('Upload an image in the "avatar" field', 'avatar');
  }
  if (file.buffer.length > MAX_AVATAR_SIZE) throw Errors.fileTooLarge('Avatar can be at most 2 MB');
  const type = detectImageType(file.buffer);
  if (!type) throw Errors.unsupportedType('Avatar must be a JPG or PNG image');

  const oldPath = user.avatarPath;
  user.avatarPath = await fileStorage.saveBuffer(file.buffer, type.ext, 'avatars');
  await user.save();
  if (oldPath) await fileStorage.removeFile(oldPath);
  return user;
}

// Finds the avatar file of a user, for GET /api/users/:id/avatar
async function getAvatarFile(userId) {
  assertId(userId, 'id');
  const user = await User.findById(userId);
  if (!user || !user.avatarPath) throw Errors.notFound('No avatar');
  const mimeType = user.avatarPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { fullPath: fileStorage.resolveStoragePath(user.avatarPath), mimeType };
}

module.exports = {
  escapeRegex,
  searchUsers,
  listContacts,
  addContact,
  removeContact,
  isContact,
  updateProfile,
  changePassword,
  detectImageType,
  setAvatar,
  getAvatarFile,
  MAX_AVATAR_SIZE,
};
