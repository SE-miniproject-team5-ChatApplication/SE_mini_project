
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { searchMessages } = require('../services/messageSearchService');

const router = express.Router();
router.use(requireAuth);

// GET /api/messages/search?q=
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const results = await searchMessages(req.userId, req.query.q);
    res.json(results);
  })
);

module.exports = { basePath: '/api/messages', router };
