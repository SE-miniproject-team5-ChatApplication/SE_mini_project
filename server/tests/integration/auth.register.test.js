const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const { User } = require('../../src/models');
const { describeDb, connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/db');

const valid = { username: 'alice_1', email: 'alice@test.com', password: 'secret123' };

describeDb('REQ-AUTH-1/2/3 POST /api/auth/register', () => {
  const app = createApp();
  const register = (body) => request(app).post('/api/auth/register').send(body);

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  test('TC-AUTH-01 registers a valid user and stores only a bcrypt hash', async () => {
    const res = await register(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ userId: expect.any(String), username: 'alice_1' });

    const saved = await User.findById(res.body.userId).select('+passwordHash');
    expect(saved.passwordHash).not.toBe(valid.password);
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(Number(saved.passwordHash.split('$')[2])).toBeGreaterThanOrEqual(10);
    expect(await bcrypt.compare(valid.password, saved.passwordHash)).toBe(true);
  });

  test('TC-AUTH-02 rejects a duplicate username (any case) with field "username"', async () => {
    await register(valid);
    const res = await register({ ...valid, username: 'ALICE_1', email: 'other@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.field).toBe('username');
  });

  test('TC-AUTH-02 rejects a duplicate email with field "email"', async () => {
    await register(valid);
    const res = await register({ ...valid, username: 'bob_1' });
    expect(res.status).toBe(409);
    expect(res.body.error.field).toBe('email');
  });

  test.each([
    ['username too short', { ...valid, username: 'ab' }, 'username'],
    ['username too long', { ...valid, username: 'a'.repeat(21) }, 'username'],
    ['username has symbols', { ...valid, username: 'ali-ce' }, 'username'],
    ['username is an object (NoSQL injection)', { ...valid, username: { $gt: '' } }, 'username'],
    ['invalid email', { ...valid, email: 'not-an-email' }, 'email'],
    ['password under 8 chars', { ...valid, password: 'abc123' }, 'password'],
    ['password without a digit', { ...valid, password: 'abcdefgh' }, 'password'],
    ['password without a letter', { ...valid, password: '12345678' }, 'password'],
  ])('TC-AUTH-01 rejects %s with 400', async (_name, body, field) => {
    const res = await register(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
    expect(await User.countDocuments()).toBe(0);
  });
});