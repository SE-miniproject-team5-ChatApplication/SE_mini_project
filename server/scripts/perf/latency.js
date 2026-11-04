/* eslint-disable no-console */
// NFR-PERF-1 / TC-PERF-01: with 100 users chatting, 95 % of messages must reach
// the online recipient within 500 ms.
// Load model (the SRS gives no message rate): every user sends one message per
// --interval ms, and the sends are spread evenly over the interval, because
// real users do not all press Send at the same moment. Latency is measured from
// the send to the message arriving on the recipient's connection.
// Usage (server running):  npm run perf:latency -- [--users 100] [--messages 6] [--interval 5000]
// Keep --interval at 500 or more: the server allows 20 messages per 10 s per user (NFR-SEC-6).
const mongoose = require('mongoose');
const { connectDb, createUsers, createPairs, connectAll, cleanup } = require('./socketLoad');
const { summary, option, sleep } = require('./lib');

const USERS = option('--users', 100);
const MESSAGES = option('--messages', 6);
const INTERVAL_MS = option('--interval', 5000);
const WAIT_MS = 10000; // how long to wait for the last messages after the final send
const LIMIT_MS = 500;
const TAG = 'load ';

async function run() {
  const users = await createUsers(USERS);
  const pairs = await createPairs(users);
  const sockets = await connectAll(users);
  try {
    const socketOf = new Map(users.map((u, i) => [u.id, sockets[i]]));
    const senders = pairs.flatMap(({ a, b, conversationId }) => [
      { user: a, conversationId },
      { user: b, conversationId },
    ]);
    const expected = senders.length * MESSAGES;
    console.log(`${sockets.length} users connected, ${pairs.length} conversations; ${expected} messages, one per user every ${INTERVAL_MS} ms`);

    const sentAt = new Map();
    const latencies = [];
    const rejected = [];
    let allArrived;
    const done = new Promise((resolve) => {
      allArrived = resolve;
    });
    sockets.forEach((s) =>
      s.on('message:new', (m) => {
        const id = (m.content || '').slice(TAG.length);
        if (!sentAt.has(id)) return;
        latencies.push(Date.now() - sentAt.get(id));
        s.emit('message:delivered', { messageId: m.id });
        if (latencies.length === expected) allArrived();
      })
    );

    const gap = INTERVAL_MS / senders.length;
    for (let round = 0; round < MESSAGES; round += 1) {
      for (const { user, conversationId } of senders) {
        const id = `${user.id}-${round}`;
        sentAt.set(id, Date.now());
        socketOf.get(user.id).emit('message:send', { conversationId, content: `${TAG}${id}`, clientMsgId: id }, (ack) => {
          if (!ack || !ack.ok) rejected.push(id);
        });
        await sleep(gap);
      }
    }
    await Promise.race([done, sleep(WAIT_MS)]);

    const missing = expected - latencies.length;
    console.log(`sent ${expected}, received ${latencies.length}, not received within ${WAIT_MS / 1000} s: ${missing}, rejected by the server: ${rejected.length}`);
    const pass = summary(`message latency with ${USERS} users`, latencies, LIMIT_MS);
    return pass && missing === 0 && rejected.length === 0;
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
