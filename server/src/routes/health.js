// GET /api/health - liveness check used for monitoring (SAD 4.4).
const express = require('express');
const { dbState } = require('../config/db');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    db: dbState(),
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

module.exports = { basePath: '/api/health', router };
