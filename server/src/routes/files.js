// File endpoints (SAD 4.3.5).
const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { Errors } = require('../utils/errors');
const { MAX_FILE_SIZE } = require('../models/Attachment');
const fileService = require('../services/fileService');

const router = express.Router();
router.use(requireAuth);

// Files are kept in memory only until they are checked and written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 5 },
});

function singleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(Errors.fileTooLarge('Files can be at most 10 MB'));
    return next(Errors.validation('Upload exactly one file in the "file" field', 'file'));
  });
}

// POST /api/files  multipart: file, conversationId -> 201 {id, fileName, mimeType, size, url}
router.post(
  '/',
  singleFile,
  asyncHandler(async (req, res) => {
    const attachment = await fileService.createAttachment({
      file: req.file,
      conversationId: req.body.conversationId,
      uploaderId: req.userId,
    });
    res.status(201).json({ attachmentId: String(attachment._id), ...attachment.toJSON() });
  })
);

module.exports = { basePath: '/api/files', router };
