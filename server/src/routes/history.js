
// History Routes (DD-HIS).
// Module owner: Raksha Arun (SRS Appendix C).
// Handles conversation listing and paginated message-history requests.
// Business logic is delegated to historyService.js.

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireMembership } = require('../middleware/membership');
const historyService = require('../services/historyService');

const router = express.Router();

router.use(requireAuth);

// GET /api/conversations -> conversation list with unread counts.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await historyService.listConversations(req.userId));
  })
);

// GET /api/conversations/:id/messages?before=<messageId>&limit=50
// Only participants of the conversation may read its history.
router.get(
  '/:id/messages',
  requireMembership('id'),
  asyncHandler(async (req, res) => {
    res.json(
      await historyService.getMessages(req.params.id, {
        before: req.query.before,
        limit: req.query.limit,
      })
    );
  })
);

module.exports = {
  basePath: '/api/conversations',
  router,
};
