// Contact list endpoints (SAD 4.3.2, REQ-PRO-4).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const userService = require('../services/userService');

const router = express.Router();
router.use(requireAuth);

// GET /api/contacts -> [user]
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await userService.listContacts(req.userId));
  })
);

// POST /api/contacts {contactUserId} -> 201 user
router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await userService.addContact(req.userId, (req.body || {}).contactUserId));
  })
);

// DELETE /api/contacts/:id -> 204
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await userService.removeContact(req.userId, req.params.id);
    res.status(204).end();
  })
);

module.exports = { basePath: '/api/contacts', router };
