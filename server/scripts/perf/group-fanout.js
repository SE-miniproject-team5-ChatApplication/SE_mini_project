/* eslint-disable no-console */
// NFR-PERF-5 / TC-PERF-04: a message to a group with 50 online members must
// reach all of them within 1 second.
// Usage (server running):  npm run perf:fanout -- [--members 50] [--messages 10]
const mongoose = require('mongoose');
const { Conversation, Member } = require('../../src/models');
const { connectDb, createUsers, connectAll, cleanup } = require('./socketLoad');
const { summary, option, sleep } = require('./lib');

const MEMBERS = option('--members', 50);
const MESSAGES = option('--messages', 10);
const WAIT_MS = 5000; // a message that has not reached everyone by then counts as failed
const LIMIT_MS = 1000;

async function run() {
  const users = await createUsers(MEMBERS);
  const group = await Conversation.create({ type: 'group', name: 'Fan-out test', createdBy: users[0].id });
  await Member.insertMany(users.map((u, i) => ({ conversationId: group._id, userId: u.id, role: i === 0 ? 'admin' : 'member' })));
  const sockets = await connectAll(users);
  try {
    const [sender, ...receivers] = sockets;
    console.log(`${sockets.length} members online`);

    const fanOutTimes = [];
    let incomplete = 0;
    let rejected = 0;
    for (let i = 0; i < MESSAGES; i += 1) {
      const content = `fanout ${i}`;
      const start = Date.now();
      const allReceived = Promise.all(
        receivers.map(
          (s) =>
            new Promise((resolve) => {
              const onMsg = (m) => {
                if (m.content !== content) return;
                s.off('message:new', onMsg);
                resolve(Date.now());
              };
              s.on('message:new', onMsg);
            })
        )
      );
      sender.emit('message:send', { conversationId: String(group._id), content, clientMsgId: `fanout-${i}` }, (ack) => {
        if (!ack || !ack.ok) rejected += 1;
      });
      const times = await Promise.race([allReceived, sleep(WAIT_MS).then(() => null)]);
      if (times) fanOutTimes.push(Math.max(...times) - start);
      else incomplete += 1;
      await sleep(500);
    }

    console.log(`sent ${MESSAGES}, reached all ${receivers.length} members: ${fanOutTimes.length}, not within ${WAIT_MS / 1000} s: ${incomplete}, rejected by the server: ${rejected}`);
    const pass = summary(`time until all ${receivers.length} members have the message`, fanOutTimes, LIMIT_MS);
    return pass && incomplete === 0 && rejected === 0;
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
