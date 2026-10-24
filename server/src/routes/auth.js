// Auth endpoints (SAD 4.3.1). Thin: all logic is in authService.
const express = require('express');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

async function requireActiveToken(req, res, next) {
  try {
    if (await authService.isRevoked(req.token && req.token.jti)) {
      return next(require('../utils/errors').Errors.unauthenticated());
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, requireActiveToken, async (req, res, next) => {
  try {
    await authService.logout({ id: req.userId, ...req.token });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
module.exports = { basePath: '/api/auth', router };