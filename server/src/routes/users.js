// REST endpoints of the User component (SAD 4.3.2).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { selfView } = require('../services/authService');
const userService = require('../services/userService');

const router = express.Router();
router.use(requireAuth);

// GET /api/users/me -> the logged-in user's own profile
// PUT /api/users/me {displayName?, statusMessage?} -> updated own profile (REQ-PRO-1)
router.put(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user, req.body);
    res.json(selfView(user));
  })
);
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
