
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');

const asyncHandler = require('../utils/asyncHandler');
const { Errors } = require('../utils/errors');
const { assertMember } = require('../services/membershipService');
const {
  saveBuffer,
  resolveStoragePath,
  removeFile,
} = require('../services/fileStorage');
const { Attachment, Message, Conversation } = require('../models');
const { MAX_FILE_SIZE } = require('../models/Attachment');
const messageService = require('../services/messageService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

async function requireConversationMember(req, res, next) {
  try {
    await assertMember(req.userId, req.params.conversationId);
    next();
  } catch (error) {
    next(error);
  }
}

function receiveFile(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(Errors.fileTooLarge('Maximum file size is 10 MB'));
      }

      return next(
        Errors.validation(
          'Upload exactly one file using the "file" field',
          'file'
        )
      );
    }

    return next(error);
  });
}

function cleanFileName(name) {
  const baseName = path.basename(name || 'attachment');
  const safeName = Array.from(baseName)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .slice(0, 255);

  return safeName || 'attachment';
}

// POST /api/files/:conversationId
// Upload a file using multipart/form-data with field name "file".
router.post(
  '/:conversationId',
  requireConversationMember,
  receiveFile,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw Errors.validation('A file is required', 'file');
    }

    const originalName = cleanFileName(req.file.originalname);
    const candidateExtension = path.extname(originalName).toLowerCase();
    const extension = /^\.[a-z0-9]{1,5}$/.test(candidateExtension)
      ? candidateExtension
      : '.bin';

    let storagePath;
    let attachment;

    try {
      storagePath = await saveBuffer(req.file.buffer, extension);

      attachment = await Attachment.create({
        fileName: originalName,
        mimeType: req.file.mimetype || 'application/octet-stream',
        size: req.file.size,
        storagePath,
        uploaderId: req.userId,
        conversationId: req.params.conversationId,
      });

      const message = await Message.create({
        conversationId: req.params.conversationId,
        senderId: req.userId,
        type: 'file',
        content: originalName,
        attachmentId: attachment._id,
        sentAt: new Date(),
      });

      await Conversation.updateOne(
        { _id: req.params.conversationId },
        {
          lastMessage: {
            messageId: message._id,
            senderId: req.userId,
            preview: originalName.slice(0, 120),
            type: 'file',
            sentAt: message.sentAt,
          },
          lastMessageAt: message.sentAt,
        }
      );

      return res.status(201).json({
        attachment: attachment.toJSON(),
        message: messageService.serialize(message),
      });
    } catch (error) {
      if (attachment) {
        await Attachment.deleteOne({ _id: attachment._id }).catch(() => {});
      }

      if (storagePath) {
        await removeFile(storagePath);
      }

      throw error;
    }
  })
);

// GET /api/files/:attachmentId
// Only current members of the attachment's conversation can download it.
router.get(
  '/:attachmentId',
  asyncHandler(async (req, res, next) => {
    const { attachmentId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(attachmentId)) {
      throw Errors.validation('Invalid attachment ID', 'attachmentId');
    }

    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      throw Errors.notFound('Attachment not found');
    }

   await assertMember(req.userId, String(attachment.conversationId));
    const fullPath = resolveStoragePath(attachment.storagePath);

    try {
      await fs.access(fullPath);
    } catch {
      throw Errors.notFound('File is no longer available');
    }

    res.set('Content-Type', attachment.mimeType);

    res.download(fullPath, attachment.fileName, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  })
);

module.exports = {
  basePath: '/api/files',
  router,
};
