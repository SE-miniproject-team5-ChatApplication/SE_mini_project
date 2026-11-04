
// History Routes (DD-HIS / component C9).
// Module owner: Raksha Arun (SRS Appendix C).
// Handles conversation listing, paginated message history and CSV exports.
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

// GET /api/conversations/:id/export
// REQ-HIS-5: export conversation history as a CSV report.
// Only authenticated conversation members may export the history.
router.get(
  '/:id/export',
  requireMembership('id'),
  asyncHandler(async (req, res) => {
    const { fileName, csv } = await historyService.exportCsv(
      req.user,
      req.params.id
    );

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    res.send(csv);
  })
);

module.exports = {
  basePath: '/api/conversations',
  router,
};
