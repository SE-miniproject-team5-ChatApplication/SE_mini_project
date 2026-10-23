// User endpoints (SAD 4.3.2). Every route here needs a logged-in user.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const userService = require('../services/userService');

const router = express.Router();
router.use(requireAuth);

// GET /api/users/search?q=
router.get('/search', async (req, res, next) => {
  try {
    res.json(await userService.searchUsers(req.user.id, req.query.q));
  } catch (err) {
    next(err);
  }
});

module.exports = { basePath: '/api/users', router };