/* eslint-disable no-console */
// Small helpers shared by the performance scripts (Test Plan TC-PERF-01).
// The scripts talk to a RUNNING server (BASE_URL) and prepare test data
// straight in its database (MONGO_URL from server/.env).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summary(label, values, limitMs) {
  const p50 = percentile(values, 50);
  const p95 = percentile(values, 95);
  const pass = values.length > 0 && p95 <= limitMs;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}: p50=${p50.toFixed(0)} ms  p95=${p95.toFixed(0)} ms  (limit ${limitMs} ms, n=${values.length})`);
  return pass;
}

// --name 123 on the command line, or the default.
function option(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : def;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { BASE_URL, percentile, summary, option, sleep };
