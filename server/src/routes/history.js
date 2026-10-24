
 // History endpoints (SAD 4.3.4).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const historyService = require('../services/historyService');

const router = express.Router();
router.use(requireAuth);

// GET /api/conversations
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await historyService.listConversations(req.userId));
  })
);

// GET /api/conversations/:conversationId/messages
// Optional query parameter: before=<messageId>
router.get(
  '/:conversationId/messages',
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { before } = req.query;

    const result = await historyService.listMessages(
      req.userId,
      conversationId,
      before
    );

    res.json(result);
  })
);

module.exports = { basePath: '/api/conversations', router };
