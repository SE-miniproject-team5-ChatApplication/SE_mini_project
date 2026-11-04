// GET /api/messages/:id/receipts -> per-member delivery/read status (sender only, REQ-RCP-5)
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const receiptService = require('../services/receiptService');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/:id/receipts',
  asyncHandler(async (req, res) => {
    res.json(await receiptService.receiptsFor(req.userId, req.params.id));
  })
);

module.exports = { basePath: '/api/messages', router };
