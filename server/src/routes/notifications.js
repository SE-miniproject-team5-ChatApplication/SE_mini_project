
// Notification routes (DD-NOT / C11).
// Module owner: Raksha Arun (SRS Appendix C).
// Exposes authenticated notification preference endpoints.
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { Errors } = require('../utils/errors');
const notificationService = require('../services/notificationService');

const router = express.Router();

router.use(requireAuth);

// PUT /api/conversations/:id/mute
// Enable or disable notifications for one conversation.
// Request body: { muted: true } or { muted: false }
// Success response: 204 No Content.
router.put(
  '/:id/mute',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const { muted } = body;

    if (typeof muted !== 'boolean') {
      throw Errors.validation('muted must be a boolean', 'muted');
    }

    await notificationService.setConversationMuted(
      req.userId,
      req.params.id,
      muted
    );

    res.status(204).end();
  })
);

module.exports = {
  basePath: '/api/conversations',
  router,
};
