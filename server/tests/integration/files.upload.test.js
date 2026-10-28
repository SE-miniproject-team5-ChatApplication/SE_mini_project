
const fs = require('fs/promises');
const path = require('path');
const request = require('supertest');
const config = require('../../src/config');
const {
  describeDb,
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
} = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { connectClient, emitAck } = require('../helpers/socket');
const { createUser } = require('../helpers/factory');
const { createDirectChat } = require('../helpers/chat');
const { Attachment } = require('../../src/models');

// Small file fixtures for upload validation.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z6kAAAAASUVORK5CYII=',
  'base64'
);

const JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/AP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Af//Z',
  'base64'
);

const GIF = Buffer.from(
  'R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
  'base64'
);

const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n',
  'utf8'
);

const TXT = Buffer.from('A valid UTF-8 text document.\n', 'utf8');

// CRC32 is used to create structurally valid ZIP test fixtures.
function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

// Creates a simple, uncompressed ZIP archive with a central directory.
function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.content, 'utf8');
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);

    centralParts.push(centralHeader, name);

    localOffset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const ZIP = makeZip([
  { name: 'readme.txt', content: 'ZIP test file' },
]);

const DOCX = makeZip([
  {
    name: '[Content_Types].xml',
    content:
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
  },
  {
    name: 'word/document.xml',
    content:
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>',
  },
]);

async function countStoredFiles(directory) {
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }

  let count = 0;

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      count += await countStoredFiles(fullPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

describeDb('File uploads and REQ-FIL-2 type validation', () => {
  let srv;
  let socket;

  beforeAll(async () => {
    await connectTestDb();
    srv = await startTestServer();
  });

  afterEach(async () => {
    if (socket) {
      socket.close();
      socket = null;
    }

    await clearTestDb();
  });

  afterAll(async () => {
    await srv.close();
    await disconnectTestDb();
  });

  const upload = (token, conversationId, buffer, name) =>
    request(srv.app)
      .post('/api/files')
      .set('Authorization', `Bearer ${token}`)
      .field('conversationId', conversationId)
      .attach('file', buffer, name);

  test('TC-FIL-01 uploads a PNG and sends it as a message', async () => {
    const { a, conversationId } = await createDirectChat();
    const res = await upload(a.token, conversationId, PNG, 'photo.png');

    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe('photo.png');
    expect(res.body.mimeType).toBe('image/png');
    expect(res.body.storagePath).toBeUndefined();

    socket = await connectClient(srv.url, a.token);
    const ack = await emitAck(socket, 'message:send', {
      conversationId,
      content: '',
      attachmentId: res.body.attachmentId,
    });

    expect(ack.ok).toBe(true);
    expect(ack.message.type).toBe('file');
    expect(ack.message.attachment.fileName).toBe('photo.png');
  });

  test.each([
    ['JPG', JPG, 'photo.jpg', 'image/jpeg'],
    ['GIF', GIF, 'animation.gif', 'image/gif'],
    ['PDF', PDF, 'document.pdf', 'application/pdf'],
    ['DOCX', DOCX, 'document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['ZIP', ZIP, 'archive.zip', 'application/zip'],
    ['TXT', TXT, 'notes.txt', 'text/plain'],
  ])('accepts a valid %s upload', async (format, buffer, name, mimeType) => {
    const { a, conversationId } = await createDirectChat();
    const res = await upload(a.token, conversationId, buffer, name);

    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe(name);
    expect(res.body.mimeType).toBe(mimeType);
    expect(res.body.storagePath).toBeUndefined();
  });

  test('TC-FIL-02 rejects files larger than 10 MB with 413', async () => {
    const { a, conversationId } = await createDirectChat();
    const big = Buffer.alloc(10 * 1024 * 1024 + 1);
    const res = await upload(a.token, conversationId, big, 'big.pdf');

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    expect(await Attachment.countDocuments()).toBe(0);
  });

  test('rejects a non-member upload', async () => {
    const { conversationId } = await createDirectChat();
    const c = await createUser();

    const res = await upload(c.token, conversationId, PNG, 'x.png');

    expect(res.status).toBe(403);
  });

  test('prevents another user from sending someone else’s attachment', async () => {
    const { a, b, conversationId } = await createDirectChat();
    const res = await upload(a.token, conversationId, PNG, 'photo.png');

    expect(res.status).toBe(201);

    socket = await connectClient(srv.url, b.token);
    const ack = await emitAck(socket, 'message:send', {
      conversationId,
      content: 'x',
      attachmentId: res.body.attachmentId,
    });

    expect(ack.ok).toBe(false);
  });

  test('rejects unsupported file extensions with 415 without storing the file', async () => {
    const { a, conversationId } = await createDirectChat();
    const beforeFiles = await countStoredFiles(config.uploadDir);
    const beforeAttachments = await Attachment.countDocuments();

    const res = await upload(a.token, conversationId, PNG, 'photo.exe');

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
    expect(await Attachment.countDocuments()).toBe(beforeAttachments);
    expect(await countStoredFiles(config.uploadDir)).toBe(beforeFiles);
  });

  test('rejects content that does not match its extension without storing it', async () => {
    const { a, conversationId } = await createDirectChat();
    const beforeFiles = await countStoredFiles(config.uploadDir);
    const beforeAttachments = await Attachment.countDocuments();

    // PNG bytes deliberately named as a PDF.
    const res = await upload(a.token, conversationId, PNG, 'fake.pdf');

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
    expect(await Attachment.countDocuments()).toBe(beforeAttachments);
    expect(await countStoredFiles(config.uploadDir)).toBe(beforeFiles);
  });

  test('rejects binary content named as a text file without storing it', async () => {
    const { a, conversationId } = await createDirectChat();
    const binary = Buffer.from([0x41, 0x00, 0x42, 0xff]);
    const beforeFiles = await countStoredFiles(config.uploadDir);
    const beforeAttachments = await Attachment.countDocuments();

    const res = await upload(a.token, conversationId, binary, 'fake.txt');

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
    expect(await Attachment.countDocuments()).toBe(beforeAttachments);
    expect(await countStoredFiles(config.uploadDir)).toBe(beforeFiles);
  });
});
