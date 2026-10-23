// Auth endpoints (SAD 4.3.1). Thin: all logic is in authService.
const express = require('express');
const authService = require('../services/authService');

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

module.exports = { basePath: '/api/auth', router };