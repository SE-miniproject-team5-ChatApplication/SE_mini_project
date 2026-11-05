/* eslint-disable no-console */
// NFR-QA-3: keeps the server running during a demo. Starts `node src/server.js`
// and starts it again whenever it exits: after 1 s, then 2, 4 ... up to 30 s if
// it keeps failing straight away. Ctrl+C stops both.
// Usage: npm run start:supervised --prefix server
const path = require('path');
const { spawn } = require('child_process');

const SERVER = path.join(__dirname, '..', 'src', 'server.js');
const STABLE_MS = 60000; // a run at least this long resets the waiting time
const MAX_DELAY_MS = 30000;

function nextDelay(previousMs, ranForMs) {
  if (ranForMs >= STABLE_MS) return 1000;
  return Math.min(Math.max(previousMs * 2, 1000), MAX_DELAY_MS);
}

function main() {
  let child = null;
  let stopping = false;
  let delay = 0;
  let restarts = 0;

  const start = () => {
    const startedAt = Date.now();
    child = spawn(process.execPath, [SERVER], { stdio: 'inherit', env: process.env });
    console.log(`[supervisor] ${new Date().toISOString()} server started (pid ${child.pid})`);
    child.on('exit', (code, signal) => {
      if (stopping) process.exit(0);
      delay = nextDelay(delay, Date.now() - startedAt);
      restarts += 1;
      console.log(`[supervisor] ${new Date().toISOString()} server exited (${signal || `code ${code}`}); restart ${restarts} in ${delay / 1000} s`);
      setTimeout(start, delay);
    });
  };

  const stop = () => {
    stopping = true;
    if (child && child.exitCode === null) child.kill();
    else process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  start();
}

if (require.main === module) main();

module.exports = { nextDelay, STABLE_MS, MAX_DELAY_MS };
