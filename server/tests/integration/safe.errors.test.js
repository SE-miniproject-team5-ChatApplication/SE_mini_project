const express = require('express');
const request = require('supertest');
const asyncHandler = require('../../src/utils/asyncHandler');
const { errorHandler } = require('../../src/middleware/errorHandler');
const { Errors } = require('../../src/utils/errors');
const { createApp } = require('../../src/app');

describe('NFR-SAFE-4 central error handler (REST)', () => {
  const app = express();
  app.use(express.json());
  app.get('/sync', () => {
    throw new Error('secret db detail');
  });
  app.get(
    '/async',
    asyncHandler(async () => {
      throw new Error('secret db detail');
    })
  );
  app.get(
    '/known',
    asyncHandler(async () => {
      throw Errors.forbidden();
    })
  );
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);

  test('TC-SAFE-04 an unexpected sync error gives a generic 500 without details', async () => {
    const res = await request(app).get('/sync');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/secret/);
  });

  test('TC-SAFE-04 an unexpected async error gives a generic 500 without details', async () => {
    const res = await request(app).get('/async');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/secret/);
  });

  test('TC-SAFE-04 known errors keep their status and code', async () => {
    const res = await request(app).get('/known');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('TC-SAFE-04 the server keeps working after failures', async () => {
    await request(app).get('/sync');
    await request(app).get('/async');
    expect((await request(app).get('/ok')).status).toBe(200);
  });

  test('TC-SAFE-04 malformed JSON gives 400, not 500', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"identifier": broken');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('TC-SAFE-04 an oversized body gives 413, not 500', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ identifier: 'a'.repeat(200 * 1024), password: 'x' });
    expect(res.status).toBe(413);
  });
});
