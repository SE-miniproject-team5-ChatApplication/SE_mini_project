// NFR-SAFE-1: daily database backup.
// Usage: npm run backup --prefix server   (schedule it once a day, see README)
// Each run writes one folder backups/<time>/ with one EJSON file per collection
// and keeps only the newest BACKUP_KEEP (default 7) folders.
// Backups contain password hashes, so files are readable by the owner only.
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const { EJSON } = mongoose.mongo.BSON;
const DEFAULT_DIR = path.join(__dirname, '..', 'backups');
const NAME_RULE = /^\d{4}-\d{2}-\d{2}T[\d-]+Z$/;

function folderName(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function pruneOld(outDir, keep) {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory() && NAME_RULE.test(e.name))
    .map((e) => e.name)
    .sort();
  const old = folders.slice(0, Math.max(0, folders.length - keep));
  await Promise.all(old.map((name) => fs.rm(path.join(outDir, name), { recursive: true, force: true })));
}

async function runBackup(db, { outDir = DEFAULT_DIR, keep = 7, now = new Date() } = {}) {
  const dir = path.join(outDir, folderName(now));
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'));

  const counts = {};
  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const text = EJSON.stringify(docs, { relaxed: false });
    await fs.writeFile(path.join(dir, `${name}.json`), text, { mode: 0o600 });
    counts[name] = docs.length;
  }
  await pruneOld(outDir, keep);
  return { dir, counts };
}

// Replaces the data of every collection found in the backup folder.
async function runRestore(db, dir) {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  const counts = {};
  for (const file of files) {
    const name = path.basename(file, '.json');
    const docs = EJSON.parse(await fs.readFile(path.join(dir, file), 'utf8'), { relaxed: false });
    await db.collection(name).deleteMany({});
    if (docs.length) await db.collection(name).insertMany(docs);
    counts[name] = docs.length;
  }
  return counts;
}

async function connectFromEnv() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  // Same database the server uses (MONGO_URL, or the default in src/config)
  const config = require('../src/config');
  await mongoose.connect(config.mongoUrl);
  return mongoose.connection.db;
}

async function main() {
  try {
    const db = await connectFromEnv();
    const keep = Number(process.env.BACKUP_KEEP) || 7;
    const outDir = process.env.BACKUP_DIR || DEFAULT_DIR;
    const { dir, counts } = await runBackup(db, { outDir, keep });
    process.stdout.write(`Backup written to ${dir}\n${JSON.stringify(counts)}\n`);
  } catch (err) {
    process.stderr.write(`Backup failed: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) main();

module.exports = { runBackup, runRestore, connectFromEnv, folderName };
