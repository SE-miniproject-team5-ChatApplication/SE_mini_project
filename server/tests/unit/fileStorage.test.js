const fs = require('fs/promises');
const path = require('path');
const config = require('../../src/config');
const { randomStorageName, resolveStoragePath, saveBuffer, removeFile } = require('../../src/services/fileStorage');

describe('REQ-FIL-5 random storage names', () => {
  test('TC-FIL-01 names are random hex and keep only a safe extension', () => {
    const a = randomStorageName('.png');
    const b = randomStorageName('.png');
    expect(a).toMatch(/^[a-f0-9]{32}\.png$/);
    expect(a).not.toBe(b);
    expect(() => randomStorageName('.png/../../x')).toThrow();
  });

  test('paths outside the upload folder are refused', () => {
    expect(() => resolveStoragePath('../../etc/passwd')).toThrow();
    expect(resolveStoragePath('files/abc.png').startsWith(path.resolve(config.uploadDir))).toBe(true);
  });

  test('saveBuffer writes the file under a random name, not the user-supplied one', async () => {
    const rel = await saveBuffer(Buffer.from('hello'), '.txt');
    expect(rel).toMatch(/^files\/[a-f0-9]{32}\.txt$/);
    expect(rel).not.toContain('my holiday photo');
    expect((await fs.readFile(resolveStoragePath(rel))).toString()).toBe('hello');
    await removeFile(rel);
    await expect(fs.access(resolveStoragePath(rel))).rejects.toThrow();
  });
});
