// NFR-SAFE-1: restore a backup folder made by backup.js.
// WARNING: replaces the current data of every collection in the backup.
// Usage: npm run restore --prefix server -- backups/<folder> --yes
const path = require('path');
const mongoose = require('mongoose');
const { runRestore, connectFromEnv } = require('./backup');

async function main() {
  const [dirArg, confirm] = process.argv.slice(2);
  if (!dirArg || confirm !== '--yes') {
    process.stderr.write('Usage: npm run restore -- <backup folder> --yes   (replaces all current data)\n');
    process.exitCode = 1;
    return;
  }
  try {
    const db = await connectFromEnv();
    const counts = await runRestore(db, path.resolve(dirArg));
    process.stdout.write(`Restored ${JSON.stringify(counts)}\n`);
  } catch (err) {
    process.stderr.write(`Restore failed: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
