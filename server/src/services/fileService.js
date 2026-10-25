// File Service (component C10): validates uploads and keeps attachment metadata.
const path = require('path');
const { Attachment } = require('../models');
const { Errors } = require('../utils/errors');
const { assertMember } = require('./membershipService');
const fileStorage = require('./fileStorage');

// Only the last part of the name is kept, without folders or odd characters.
function cleanFileName(name) {
  const base = path.basename(String(name || 'file').replace(/\\/g, '/'));
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim();
  return (cleaned || 'file').slice(0, 255);
}

function extensionOf(name) {
  const ext = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '.bin';
}

// REQ-FIL-1: one file of up to 10 MB attached in a direct or group conversation.
async function createAttachment({ file, conversationId, uploaderId }) {
  if (!file) throw Errors.validation('Choose a file to upload', 'file');
  await assertMember(uploaderId, conversationId);
  const fileName = cleanFileName(file.originalname);
  const storagePath = await fileStorage.saveBuffer(file.buffer, extensionOf(fileName));
  return Attachment.create({
    fileName,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size,
    storagePath,
    uploaderId,
    conversationId,
  });
}

module.exports = { createAttachment, cleanFileName, extensionOf };
