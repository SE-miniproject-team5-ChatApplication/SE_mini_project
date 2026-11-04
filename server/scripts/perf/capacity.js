/* eslint-disable no-console */
// NFR-PERF-2 / TC-PERF-01 (second part): the server keeps 200 WebSocket
// connections open at once without losing messages. Every user sends one
// message a second for --messages seconds; each one must be acknowledged by the
// server (so it was stored, REQ-MSG-3) and must reach the recipient.
// Usage (server running):  npm run perf:capacity -- [--users 200] [--messages 5]
const mongoose = require('mongoose');
const { connectDb, createUsers, createPairs, connectAll, cleanup } = require('./socketLoad');
const { BASE_URL, option, sleep } = require('./lib');

const USERS = option('--users', 200);
const MESSAGES = option('--messages', 5);
const ACK_TIMEOUT_MS = 10000;

async function run() {
  const users = await createUsers(USERS);
  const pairs = await createPairs(users);
  let sockets;
  try {
    sockets = await connectAll(users);
  } catch (err) {
    console.log(`FAIL  could not open ${USERS} connections: ${err.message}`);
    return false;
  }
  try {
    const open = sockets.filter((s) => s.connected).length;
    console.log(`${open}/${USERS} connections open`);
    const socketOf = new Map(users.map((u, i) => [u.id, sockets[i]]));

    const received = new Set();
    sockets.forEach((s) => s.on('message:new', (m) => received.add(m.clientMsgId)));

    const sent = [];
    const acked = new Set();
    const rejected = [];
    const sends = [];
    for (let round = 0; round < MESSAGES; round += 1) {
      for (const { a, b, conversationId } of pairs) {
        for (const sender of [a, b]) {
          const id = `${sender.id}-${round}`;
          sent.push(id);
          sends.push(
            socketOf
              .get(sender.id)
              .timeout(ACK_TIMEOUT_MS)
              .emitWithAck('message:send', { conversationId, content: `cap ${round}`, clientMsgId: id })
              .then((ack) => (ack && ack.ok ? acked.add(id) : rejected.push(id)))
              .catch(() => {}) // no acknowledgement within the timeout: counted below
          );
        }
      }
      await sleep(1000);
    }
    await Promise.all(sends);
    await sleep(2000);

    const notAcked = sent.length - acked.size;
    const notReceived = sent.filter((id) => !received.has(id)).length;
    const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.status).catch(() => 0);
    console.log(
      `sent ${sent.length}, acknowledged ${acked.size} (rejected ${rejected.length}, no answer within ` +
        `${ACK_TIMEOUT_MS / 1000} s ${notAcked - rejected.length}), received ${sent.length - notReceived}, health HTTP ${health}`
    );
    const ok = open === USERS && notAcked === 0 && notReceived === 0 && health === 200;
    console.log(
      ok
        ? `PASS  ${USERS} connections: every message stored and delivered`
        : `FAIL  ${USERS} connections: ${notAcked} not acknowledged, ${notReceived} not received`
    );
    return ok;
  } finally {
    sockets.forEach((s) => s.close());
  }
}

async function main() {
  await connectDb();
  let ok = false;
  try {
    ok = await run();
  } finally {
    if (!process.argv.includes('--keep')) await cleanup();
    await mongoose.disconnect();
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
