/* eslint-disable no-console */
// Shared set-up for the WebSocket load scripts: creates test users straight in
// the database (fast, and does not hit the REST rate limit), pairs them into
// direct conversations and opens one Socket.IO client per user.
const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');
const { BASE_URL } = require('./lib');
const config = require('../../src/config');
const { User, Contact, Conversation, Member, Message } = require('../../src/models');
const { signToken } = require('../../src/utils/jwt');

const PREFIX = 'perf_';

async function connectDb() {
  await mongoose.connect(config.mongoUrl);
}

async function createUsers(count) {
  const stamp = Date.now().toString(36);
  const docs = Array.from({ length: count }, (_, i) => ({
    username: `${PREFIX}${stamp}_${i}`,
    email: `${PREFIX}${stamp}_${i}@load.test`,
    passwordHash: 'load-test-user',
    displayName: `Load ${i}`,
  }));
  const users = await User.insertMany(docs);
  return users.map((u) => ({ id: String(u._id), token: signToken(u).token }));
}

// Pairs user 0-1, 2-3, ... and returns [{a, b, conversationId}]
async function createPairs(users) {
  const pairs = [];
  for (let i = 0; i + 1 < users.length; i += 2) {
    const [a, b] = [users[i], users[i + 1]];
    await Contact.insertMany([
      { userId: a.id, contactUserId: b.id },
      { userId: b.id, contactUserId: a.id },
    ]);
    const conv = await Conversation.create({ type: 'direct', createdBy: a.id, directKey: Conversation.directKeyFor(a.id, b.id) });
    await Member.insertMany([
      { conversationId: conv._id, userId: a.id },
      { conversationId: conv._id, userId: b.id },
    ]);
    pairs.push({ a, b, conversationId: String(conv._id) });
  }
  return pairs;
}

function connect(user) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(BASE_URL, { auth: { token: user.token }, transports: ['websocket'], forceNew: true, reconnection: false });
    socket.once('session:ready', () => resolve(socket));
    socket.once('connect_error', (err) => {
      socket.close();
      reject(new Error(`cannot connect to ${BASE_URL}: ${err.message}`));
    });
  });
}

async function connectAll(users, batch = 25) {
  const sockets = [];
  for (let i = 0; i < users.length; i += batch) {
    sockets.push(...(await Promise.all(users.slice(i, i + batch).map(connect))));
  }
  return sockets;
}

// Removes every load-test user and their data, including any left behind by
// an earlier run that stopped half way.
async function cleanup() {
  const ids = await User.find({ username: new RegExp(`^${PREFIX}`) }).distinct('_id');
  const conversations = await Member.find({ userId: { $in: ids } }).distinct('conversationId');
  await Promise.all([
    Message.deleteMany({ conversationId: { $in: conversations } }),
    Conversation.deleteMany({ _id: { $in: conversations } }),
    Member.deleteMany({ conversationId: { $in: conversations } }),
    Contact.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
  console.log(`Cleaned up ${ids.length} load-test users`);
}

module.exports = { connectDb, createUsers, createPairs, connectAll, cleanup, PREFIX };
