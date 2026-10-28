
const path = require('path');
const FileType = require('file-type');
const { Attachment } = require('../models');
const { Errors } = require('../utils/errors');
const { assertMember } = require('./membershipService');
const fileStorage = require('./fileStorage');

const ALLOWED_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
};

function cleanFileName(name) {
  const base = path.basename(String(name || 'file').replace(/\\/g, '/'));
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim();
  return (cleaned || 'file').slice(0, 255);
}

function extensionOf(name) {
  return path.extname(name).toLowerCase();
}

function rejectUnsupportedType() {
  throw Errors.unsupportedType(
    'Only JPG, PNG, GIF, PDF, DOCX, TXT and ZIP files are allowed'
  );
}

function isUtf8Text(buffer) {
  if (buffer.includes(0)) return false;

  const decoded = buffer.toString('utf8');
  if (decoded.includes('\uFFFD')) return false;

  return Buffer.from(decoded, 'utf8').equals(buffer);
}

// Reads ZIP central-directory entries to distinguish DOCX from ordinary ZIP.
function getZipEntryNames(buffer) {
  const names = [];
  let offset = 0;

  while (offset + 46 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);

    if (signature !== 0x02014b50) {
      offset += 1;
      continue;
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const end = offset + 46 + nameLength + extraLength + commentLength;

    if (end > buffer.length) return [];

    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8');

    names.push(name);
    offset = end;
  }

  return names;
}

async function validateFile(file, fileName) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    rejectUnsupportedType();
  }

  const extension = extensionOf(fileName);

  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, extension)) {
    rejectUnsupportedType();
  }

  if (extension === '.txt') {
    if (!isUtf8Text(file.buffer)) rejectUnsupportedType();
    return { mimeType: ALLOWED_TYPES[extension] };
  }

  // file-type 16 uses the CommonJS-compatible fromBuffer API.
  const detected = await FileType.fromBuffer(file.buffer);

  if (!detected) rejectUnsupportedType();

  if (extension === '.docx') {
    const names = getZipEntryNames(file.buffer);
    const hasContentTypes = names.includes('[Content_Types].xml');
    const hasDocument = names.includes('word/document.xml');

    if (detected.ext !== 'docx' && detected.ext !== 'zip') {
      rejectUnsupportedType();
    }

    if (!hasContentTypes || !hasDocument) rejectUnsupportedType();

    return { mimeType: ALLOWED_TYPES[extension] };
  }

  if (extension === '.zip') {
    if (detected.ext !== 'zip') rejectUnsupportedType();
    return { mimeType: ALLOWED_TYPES[extension] };
  }

  if (detected.mime !== ALLOWED_TYPES[extension]) {
    rejectUnsupportedType();
  }

  return { mimeType: ALLOWED_TYPES[extension] };
}

async function createAttachment({ file, conversationId, uploaderId }) {
  if (!file) {
    throw Errors.validation('Choose a file to upload', 'file');
  }

  await assertMember(uploaderId, conversationId);

  const fileName = cleanFileName(file.originalname);
  const { mimeType } = await validateFile(file, fileName);

  // Validation happens before any file is written to storage.
  const storagePath = await fileStorage.saveBuffer(
    file.buffer,
    extensionOf(fileName)
  );

  try {
    return await Attachment.create({
      fileName,
      mimeType,
      size: file.size,
      storagePath,
      uploaderId,
      conversationId,
    });
  } catch (error) {
    await fileStorage.removeFile(storagePath);
    throw error;
  }
}

module.exports = {
  createAttachment,
  cleanFileName,
  extensionOf,
  validateFile,
};
