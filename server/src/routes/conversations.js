// Starting conversations. (Listing and history are in routes/history.js.)
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const conversationService = require('../services/conversationService');

const router = express.Router();
router.use(requireAuth);

// POST /api/conversations/direct {userId} -> conversation view
router.post(
  '/direct',
  asyncHandler(async (req, res) => {
    res.json(await conversationService.getOrCreateDirect(req.userId, (req.body || {}).userId));
  })
);

module.exports = { basePath: '/api/conversations', router };
