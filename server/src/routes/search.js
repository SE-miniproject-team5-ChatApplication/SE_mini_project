// GET /api/search?q=meeting&conversationId=<optional> -> [{message, conversationId, conversationName, snippet}]
// (SAD 4.3.4, REQ-HIS-3, REQ-HIS-4)
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const historyService = require('../services/historyService');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await historyService.search(req.userId, { q: req.query.q, conversationId: req.query.conversationId }));
  })
);

module.exports = { basePath: '/api/search', router };
