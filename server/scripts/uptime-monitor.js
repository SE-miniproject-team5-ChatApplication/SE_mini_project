/* eslint-disable no-console */
// NFR-QA-3: the server must be available at least 99 % of the time during demos
// and testing. Checks GET /api/health every --interval seconds; a check counts
// as up only when the server answers within 5 s and reports the database as up.
// Usage: npm run monitor --prefix server -- [--minutes 60] [--interval 10] [--url http://localhost:5000]
// Without --minutes it runs until Ctrl+C. Exit code 0 when availability >= 99 %.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TARGET = 99;
const TIMEOUT_MS = 5000;

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
}

// Availability, longest outage and response times from checks [{up, ms}].
function summarise(checks, intervalS) {
  const up = checks.filter((c) => c.up);
  const availability = checks.length ? (up.length / checks.length) * 100 : 0;
  let run = 0;
  let longest = 0;
  for (const c of checks) {
    run = c.up ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  const times = up.map((c) => c.ms).sort((a, b) => a - b);
  const at = (p) => (times.length ? times[Math.min(times.length - 1, Math.ceil((p / 100) * times.length) - 1)] : 0);
  return {
    checks: checks.length,
    up: up.length,
    availability,
    longestOutageS: longest * intervalS,
    p50: at(50),
    p95: at(95),
    max: times.length ? times[times.length - 1] : 0,
    pass: checks.length > 0 && availability >= TARGET,
  };
}

async function checkOnce(url) {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = await res.json();
    return { at: new Date(), up: res.ok && body.status === 'ok' && body.db === 'up', ms: Date.now() - start, detail: `db=${body.db}` };
  } catch (err) {
    return { at: new Date(), up: false, ms: Date.now() - start, detail: err.message };
  }
}

async function main() {
  const url = arg('--url', process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`);
  const intervalS = Number(arg('--interval', 10));
  const minutes = Number(arg('--minutes', 0));
  const checks = [];
  const started = new Date();

  const finish = () => {
    const s = summarise(checks, intervalS);
    console.log(`\nMonitored ${url} from ${started.toISOString()} to ${new Date().toISOString()}`);
    console.log(`${s.up}/${s.checks} checks up = ${s.availability.toFixed(2)} % (target ${TARGET} %), longest outage about ${s.longestOutageS} s`);
    console.log(`health response time: p50=${s.p50} ms  p95=${s.p95} ms  max=${s.max} ms`);
    console.log(s.pass ? 'PASS' : 'FAIL');
    process.exit(s.pass ? 0 : 1);
  };
  process.on('SIGINT', finish);

  const end = minutes > 0 ? Date.now() + minutes * 60000 : Infinity;
  while (Date.now() < end) {
    const t0 = Date.now();
    const c = await checkOnce(url);
    checks.push(c);
    const s = summarise(checks, intervalS);
    console.log(`${c.at.toISOString()}  ${c.up ? 'UP  ' : 'DOWN'}  ${c.ms} ms  ${c.detail}  availability=${s.availability.toFixed(2)} %`);
    await new Promise((r) => setTimeout(r, Math.max(0, intervalS * 1000 - (Date.now() - t0))));
  }
  finish();
}

if (require.main === module) main();

module.exports = { summarise, TARGET };
