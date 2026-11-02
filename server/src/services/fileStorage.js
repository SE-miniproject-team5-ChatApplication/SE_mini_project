
// File Storage Service (DD-FIL / component C10).
// Module owner: Raksha Arun (SRS Appendix C).
// Responsibility: secure physical storage, file naming, path resolution,
// and deletion of uploaded attachment files.
// Attachment validation and database operations belong to fileService.js.

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

const EXT_RULE = /^\.[a-z0-9]{1,5}$/;

// Generate a random storage name instead of using the original filename.
function randomStorageName(ext) {
  if (!EXT_RULE.test(ext)) throw new Error('Invalid file extension');
  return crypto.randomBytes(16).toString('hex') + ext;
}

// Convert a relative storage path into an absolute path.
// Prevent path traversal outside the configured upload directory.
function resolveStoragePath(storagePath) {
  const root = path.resolve(config.uploadDir);
  const full = path.resolve(root, storagePath);

  if (!full.startsWith(root + path.sep)) {
    throw new Error('Invalid storage path');
  }

  return full;
}

// Save a file using exclusive creation and owner-only permissions.
async function saveBuffer(buffer, ext, folder = 'files') {
  const relative = path.posix.join(folder, randomStorageName(ext));
  const full = resolveStoragePath(relative);

  await fs.mkdir(path.dirname(full), { recursive: true });
  // "wx": never overwrite an existing file; 0o600: readable by the server only.
  await fs.writeFile(full, buffer, { flag: 'wx', mode: 0o600 });

  return relative;
}

// Remove a stored file when it is no longer needed.
async function removeFile(storagePath) {
  try {
    await fs.unlink(resolveStoragePath(storagePath));
  } catch {
    // File may already be absent.
  }
}

module.exports = {
  randomStorageName,
  resolveStoragePath,
  saveBuffer,
  removeFile,
};
