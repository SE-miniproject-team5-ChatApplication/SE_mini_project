// Group endpoints (SAD 4.3.3).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { requireMembership } = require('../middleware/membership');
const groupService = require('../services/groupService');

const router = express.Router();
router.use(requireAuth);

// POST /api/groups {name, memberIds[]} -> 201 {groupId, ...group}
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, memberIds } = req.body || {};
    const group = await groupService.createGroup(req.userId, { name, memberIds });
    res.status(201).json({ groupId: group.id, ...group });
  })
);

// GET /api/groups/:id -> group with members and roles (members only)
router.get(
  '/:id',
  requireMembership('id'),
  asyncHandler(async (req, res) => {
    res.json(await groupService.getGroup(req.params.id));
  })
);

module.exports = { basePath: '/api/groups', router };
