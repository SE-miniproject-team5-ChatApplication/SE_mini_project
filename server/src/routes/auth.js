// REST endpoints of the Auth component (SAD 4.3.1).
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register  {username, email, password} -> 201 {userId, username}
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body || {};
    const user = await authService.register({ username, email, password });
    res.status(201).json({ userId: String(user._id), username: user.username });
  })
);

// POST /api/auth/login  {identifier, password} -> 200 {token, expiresIn, user}
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body || {};
    res.json(await authService.login({ identifier, password }));
  })
);

// POST /api/auth/logout -> 204
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logout(req.userId, req.token);
    res.status(204).end();
  })
);

module.exports = { basePath: '/api/auth', router };
