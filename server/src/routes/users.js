// REST endpoints of the User component (SAD 4.3.2).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { selfView } = require('../services/authService');
const userService = require('../services/userService');

const router = express.Router();
router.use(requireAuth);

// GET /api/users/me -> the logged-in user's own profile
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(selfView(req.user));
  })
);

// GET /api/users/search?q=pra -> [{id, username, displayName, ...}]
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    res.json(await userService.searchUsers(req.query.q, req.userId));
  })
);

module.exports = { basePath: '/api/users', router };
