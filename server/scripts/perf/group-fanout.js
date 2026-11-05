/* eslint-disable no-console */
// NFR-PERF-5 / TC-PERF-04: a message to a group with 50 online members must
// reach all of them within 1 second.
// Usage (server running):  node scripts/perf/group-fanout.js [--members 50] [--messages 10]
const mongoose = require('mongoose');
const { Conversation, Member } = require('../../src/models');
const { connectDb, createUsers, connectAll, cleanup } = require('./socketLoad');
const { summary } = require('./lib');

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};
const MEMBERS = arg('--members', 50);
const MESSAGES = arg('--messages', 10);

async function main() {
  await connectDb();
  const users = await createUsers(MEMBERS);
  const group = await Conversation.create({ type: 'group', name: 'Fan-out test', createdBy: users[0].id });
  await Member.insertMany(users.map((u, i) => ({ conversationId: group._id, userId: u.id, role: i === 0 ? 'admin' : 'member' })));
  const sockets = await connectAll(users);
  const [sender, ...receivers] = sockets;
  console.log(`${sockets.length} members online`);

  const fanOutTimes = [];
  for (let i = 0; i < MESSAGES; i += 1) {
    const start = Date.now();
    const allReceived = Promise.all(
      receivers.map(
        (s) =>
          new Promise((resolve) => {
            const onMsg = (m) => {
              if (m.content !== `fanout ${i}`) return;
              s.off('message:new', onMsg);
              resolve(Date.now());
            };
            s.on('message:new', onMsg);
          })
      )
    );
    sender.emit('message:send', { conversationId: String(group._id), content: `fanout ${i}`, clientMsgId: `fanout-${i}` });
    const times = await Promise.race([allReceived, new Promise((r) => setTimeout(() => r(null), 5000))]);
    fanOutTimes.push(times ? Math.max(...times) - start : 5000);
    await new Promise((r) => setTimeout(r, 500));
  }

  const ok = summary(`time until all ${receivers.length} members have the message`, fanOutTimes, 1000);
  sockets.forEach((s) => s.close());
  await Promise.all([Member.deleteMany({ conversationId: group._id }), Conversation.deleteOne({ _id: group._id })]);
  if (!process.argv.includes('--keep')) await cleanup();
  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
