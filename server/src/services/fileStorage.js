// File storage for uploads (component C10 / ADR-5).
// REQ-FIL-5: files are saved under random names, never the name the user gave,
// in a folder outside any public web directory. Only the File Service reads them.
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

const EXT_RULE = /^\.[a-z0-9]{1,5}$/;

function randomStorageName(ext) {
  if (!EXT_RULE.test(ext)) throw new Error('Invalid file extension');
  return crypto.randomBytes(16).toString('hex') + ext;
}

// Turns a stored relative path into an absolute one and refuses anything that
// would escape the upload folder (e.g. "../../etc/passwd").
function resolveStoragePath(storagePath) {
  const root = path.resolve(config.uploadDir);
  const full = path.resolve(root, storagePath);
  if (!full.startsWith(root + path.sep)) throw new Error('Invalid storage path');
  return full;
}

async function saveBuffer(buffer, ext, folder = 'files') {
  const relative = path.posix.join(folder, randomStorageName(ext));
  const full = resolveStoragePath(relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  // "wx": never overwrite an existing file; 0o600: readable by the server only.
  await fs.writeFile(full, buffer, { flag: 'wx', mode: 0o600 });
  return relative;
}

async function removeFile(storagePath) {
  try {
    await fs.unlink(resolveStoragePath(storagePath));
  } catch {
    // already gone
  }
}

module.exports = { randomStorageName, resolveStoragePath, saveBuffer, removeFile };
