// Test database helpers. Database tests run only when MONGO_URL is set
// (CI always sets it). Each Jest worker gets its own database so files can run in parallel.
const mongoose = require('mongoose');

const hasDb = Boolean(process.env.MONGO_URL);
const describeDb = hasDb ? describe : describe.skip;

function testDbName() {
  return `chatapp_test_${process.env.JEST_WORKER_ID || '1'}`;
}

async function connectTestDb() {
  if (!hasDb) throw new Error('MONGO_URL is not set - copy server/.env.test.example to server/.env.test');
  const dbName = testDbName();
  if (!dbName.includes('test')) throw new Error('Refusing to use a non-test database');
  await mongoose.connect(process.env.MONGO_URL, { dbName });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function clearTestDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function disconnectTestDb() {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

module.exports = { hasDb, describeDb, connectTestDb, clearTestDb, disconnectTestDb };
