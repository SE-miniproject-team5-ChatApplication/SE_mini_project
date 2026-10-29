
const express = require('express');
const multer = require('multer');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { Errors } = require('../utils/errors');
const { MAX_FILE_SIZE } = require('../models/Attachment');
const fileService = require('../services/fileService');

const router = express.Router();
router.use(requireAuth);

// Keep uploaded files in memory until validated by the file service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 5 },
});

function singleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        Errors.fileTooLarge('Files can be at most 10 MB')
      );
    }

    return next(
      Errors.validation(
        'Upload exactly one file in the "file" field',
        'file'
      )
    );
  });
}

// POST /api/files — upload a validated attachment.
router.post(
  '/',
  singleFile,
  asyncHandler(async (req, res) => {
    const attachment = await fileService.createAttachment({
      file: req.file,
      conversationId: req.body.conversationId,
      uploaderId: req.userId,
    });

    res.status(201).json({
      attachmentId: String(attachment._id),
      ...attachment.toJSON(),
    });
  })
);

// GET /api/files/:id — securely download an authorized attachment.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    // The service validates the ID and checks conversation membership.
    const file = await fileService.getForDownload(
      req.userId,
      req.params.id
    );

    // Use only the MIME type validated and stored by the server.
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);

    // Prevent browsers from interpreting content as another MIME type.
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Force downloads instead of inline rendering.
    const safeFileName = file.fileName.replace(/["\\]/g, '_');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
    );

    // Avoid storing potentially sensitive attachment responses in caches.
    res.setHeader('Cache-Control', 'private, no-store');

    // Send the file only after authorization succeeds.
    res.sendFile(path.resolve(file.path));
  })
);

module.exports = { basePath: '/api/files', router };
