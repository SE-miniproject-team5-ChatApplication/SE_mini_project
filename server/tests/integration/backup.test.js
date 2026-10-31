const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { runBackup, runRestore } = require('../../scripts/backup');
const { User, Contact } = require('../../src/models');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

describeDb('NFR-SAFE-1 daily backup', () => {
  let outDir;
  const db = () => mongoose.connection.db;

  beforeAll(connectTestDb);
  beforeEach(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-backup-'));
  });
  afterEach(async () => {
    fs.rmSync(outDir, { recursive: true, force: true });
    await clearTestDb();
  });
  afterAll(disconnectTestDb);

  test('TC-SAFE-02 writes one file per collection with all documents', async () => {
    const a = await createUser();
    const b = await createUser();
    await Contact.create({ userId: a.id, contactUserId: b.id });

    const { dir, counts } = await runBackup(db(), { outDir });
    expect(counts.users).toBe(2);
    expect(counts.contacts).toBe(1);
    expect(fs.existsSync(path.join(dir, 'users.json'))).toBe(true);
  });

  test('TC-SAFE-02 backup files are readable by the owner only', async () => {
    await createUser();
    const { dir } = await runBackup(db(), { outDir });
    const mode = fs.statSync(path.join(dir, 'users.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  test('TC-SAFE-02 a backup can be restored after data loss', async () => {
    const a = await createUser({ username: 'alice_1' });
    const { dir } = await runBackup(db(), { outDir });

    await clearTestDb();
    expect(await User.countDocuments()).toBe(0);

    await runRestore(db(), dir);
    const restored = await User.findById(a.id);
    expect(restored.username).toBe('alice_1');
  });

  test('TC-SAFE-02 keeps only the newest backups', async () => {
    const day = 24 * 60 * 60 * 1000;
    const start = Date.UTC(2026, 9, 1);
    for (let i = 0; i < 4; i += 1) {
      await runBackup(db(), { outDir, keep: 2, now: new Date(start + i * day) });
    }
    expect(fs.readdirSync(outDir).sort()).toEqual(['2026-10-03T00-00-00-000Z', '2026-10-04T00-00-00-000Z']);
  });
});
