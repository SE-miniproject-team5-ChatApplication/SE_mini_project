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

// REQ-GRP-2 admin actions ------------------------------------------------------

// POST /api/groups/:id/members {userId} -> 200 group
router.post(
  '/:id/members',
  asyncHandler(async (req, res) => {
    res.json(await groupService.addMember(req.userId, req.params.id, (req.body || {}).userId));
  })
);

// DELETE /api/groups/:id/members/:userId -> 200 group
router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    res.json(await groupService.removeMember(req.userId, req.params.id, req.params.userId));
  })
);

// PUT /api/groups/:id {name} -> 200 group
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await groupService.renameGroup(req.userId, req.params.id, (req.body || {}).name));
  })
);

// POST /api/groups/:id/admins {userId} -> 200 group
router.post(
  '/:id/admins',
  asyncHandler(async (req, res) => {
    res.json(await groupService.promoteAdmin(req.userId, req.params.id, (req.body || {}).userId));
  })
);

// POST /api/groups/:id/leave -> 204 (admin succession applied)  (REQ-GRP-4)
router.post(
  '/:id/leave',
  asyncHandler(async (req, res) => {
    await groupService.leaveGroup(req.userId, req.params.id);
    res.status(204).end();
  })
);

module.exports = { basePath: '/api/groups', router };
