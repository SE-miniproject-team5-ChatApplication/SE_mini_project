
const request = require('supertest');
const express = require('express');
const app = require('../server');
const errorHandler = require('../server/middleware/errorHandler');

describe('Server error handling', () => {
  let testApp;

  beforeAll(() => {
    testApp = express();

    testApp.use((req, res, next) => {
      req.requestId = 'test-request-id';
      next();
    });

    testApp.get('/test-error', (req, res, next) => {
      const error = new Error('Something went wrong');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.field = 'email';
      next(error);
    });

    testApp.get('/test-error-no-code', (req, res, next) => {
      const error = new Error('Invalid input');
      error.statusCode = 400;
      next(error);
    });

    testApp.get('/test-server-error', (req, res, next) => {
      next(new Error('Sensitive internal detail'));
    });

    testApp.use(errorHandler);
  });

  it('returns a validation error and includes the field', async () => {
    const response = await request(testApp).get('/test-error');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.field).toBe('email');
    expect(response.body.error.requestId).toBe('test-request-id');
  });

  it('uses the default validation error code when none is provided', async () => {
    const response = await request(testApp).get('/test-error-no-code');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('hides internal details for server errors', async () => {
    const response = await request(testApp).get('/test-server-error');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).toBe('Internal server error');
  });

  it('still exposes the health endpoint', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
