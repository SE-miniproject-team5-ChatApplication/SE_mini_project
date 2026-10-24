// History endpoints (SAD 4.3.4).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const historyService = require('../services/historyService');

const router = express.Router();
router.use(requireAuth);

// GET /api/conversations -> [{id, type, name, lastMessage, unread, ...}]
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await historyService.listConversations(req.userId));
  })
);

module.exports = { basePath: '/api/conversations', router };
