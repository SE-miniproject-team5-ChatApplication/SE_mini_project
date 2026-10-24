// GET /api/presence?ids=<id>,<id> -> [{userId, status}]  (initial state for the client;
// later changes arrive as presence:update socket events).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { isValidId } = require('../utils/ids');
const { Errors } = require('../utils/errors');
const presenceService = require('../services/presenceService');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const ids = String(req.query.ids || '')
      .split(',')
      .filter(Boolean);
    if (ids.length > 200 || !ids.every(isValidId)) throw Errors.validation('ids must be up to 200 user ids', 'ids');
    res.json(await presenceService.statusOf(ids));
  })
);

module.exports = { basePath: '/api/presence', router };
