const fs = require('fs');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models');
const { resolveStoragePath } = require('../../src/services/fileStorage');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');
const { createUser } = require('../helpers/factory');

// Tiny fake images: only the first bytes matter for the type check
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const GIF = Buffer.from('GIF89a' + 'x'.repeat(100));

describeDb('REQ-PRO-2 avatar upload', () => {
  const app = createApp();
  let me;
  const upload = (buffer, filename, contentType) =>
    request(app)
      .post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${me.token}`)
      .attach('avatar', buffer, { filename, contentType });
  const view = (id) => request(app).get(`/api/users/${id}/avatar`).set('Authorization', `Bearer ${me.token}`);

  beforeAll(connectTestDb);
  beforeEach(async () => {
    me = await createUser({ username: 'alice_1' });
  });
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-PRO-01 uploads a PNG and it can be viewed', async () => {
    const res = await upload(PNG, 'me.png', 'image/png');
    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBe(`/api/users/${me.id}/avatar`);

    const img = await view(me.id);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toMatch(/image\/png/);
  });

  test('TC-PRO-01 uploads a JPG', async () => {
    const res = await upload(JPG, 'me.jpg', 'image/jpeg');
    expect(res.status).toBe(200);
    expect((await view(me.id)).headers['content-type']).toMatch(/image\/jpeg/);
  });

  test('TC-PRO-01 rejects a file over 2 MB with 413', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await upload(big, 'big.png', 'image/png');
    expect(res.status).toBe(413);
  });

  test('TC-PRO-01 rejects a GIF with 415', async () => {
    const res = await upload(GIF, 'a.gif', 'image/gif');
    expect(res.status).toBe(415);
  });

  test('TC-PRO-01 rejects a non-image renamed to .png with 415', async () => {
    const res = await upload(Buffer.from('not really an image'), 'fake.png', 'image/png');
    expect(res.status).toBe(415);
  });

  test('TC-PRO-01 rejects a request with no file', async () => {
    const res = await request(app).post('/api/users/me/avatar').set('Authorization', `Bearer ${me.token}`);
    expect(res.status).toBe(400);
  });

  test('TC-PRO-01 a new avatar replaces and deletes the old file', async () => {
    await upload(PNG, 'one.png', 'image/png');
    const first = (await User.findById(me.id)).avatarPath;
    await upload(JPG, 'two.jpg', 'image/jpeg');
    const second = (await User.findById(me.id)).avatarPath;
    expect(second).not.toBe(first);
    expect(fs.existsSync(resolveStoragePath(first))).toBe(false);
    expect(fs.existsSync(resolveStoragePath(second))).toBe(true);
  });

  test('TC-PRO-01 viewing a user with no avatar gives 404', async () => {
    expect((await view(me.id)).status).toBe(404);
  });

  test('TC-PRO-01 requires a logged-in user', async () => {
    const res = await request(app).post('/api/users/me/avatar').attach('avatar', PNG, 'a.png');
    expect(res.status).toBe(401);
  });
});
