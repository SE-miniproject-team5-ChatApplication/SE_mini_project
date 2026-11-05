
// File Service (DD-FIL / component C10).
// Module owner: Raksha Arun (SRS Appendix C).
// Responsibility: file-name sanitization, file-type validation,
// attachment creation, and authorization of attachment downloads.
// Physical file operations are delegated to fileStorage.js.

const path = require('path');
const FileType = require('file-type');
const { Attachment } = require('../models');
const { Errors } = require('../utils/errors');
const { assertMember } = require('./membershipService');
const { assertId } = require('../utils/ids');
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

// First bytes every file of the type must start with. Checked before file-type
// runs, so content of any other format (for example a malformed ASF video, which
// makes file-type 16 loop forever, GHSA-5v7r-6r5c-r473) never reaches its parsers.
const SIGNATURES = {
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  '.pdf': [Buffer.from('%PDF-')],
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.zip': [[0x50, 0x4b, 0x03, 0x04]],
};

function startsWithSignature(buffer, extension) {
  return SIGNATURES[extension].some((sig) => buffer.length >= sig.length && buffer.subarray(0, sig.length).equals(Buffer.from(sig)));
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

// Validates file content using its detected signature and expected extension.
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

  if (!startsWithSignature(file.buffer, extension)) rejectUnsupportedType();

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

// Validates and stores an attachment belonging to a conversation member.
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

// REQ-FIL-4: only authenticated members of the conversation
// containing the attachment can download it.
async function getForDownload(userId, attachmentId) {
  assertId(attachmentId, 'attachmentId');

  const attachment = await Attachment.findById(attachmentId);

  if (!attachment) {
    throw Errors.notFound('File not found');
  }

  await assertMember(userId, String(attachment.conversationId));

  return {
    path: fileStorage.resolveStoragePath(attachment.storagePath),
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
  };
}

module.exports = {
  createAttachment,
  getForDownload,
  cleanFileName,
  extensionOf,
  validateFile,
};
