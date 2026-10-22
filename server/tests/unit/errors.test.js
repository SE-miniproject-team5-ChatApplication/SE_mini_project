const { AppError, Errors, toErrorBody } = require('../../src/utils/errors');

describe('Standard error format (SAD 4.4)', () => {
  test('known errors keep code, message and field', () => {
    const body = toErrorBody(Errors.validation('Too short', 'username'), 'req-1');
    expect(body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'Too short', field: 'username', requestId: 'req-1' } });
  });

  test('unknown errors never leak internal details', () => {
    const body = toErrorBody(new Error('db password is hunter2'));
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toMatch(/hunter2/);
  });

  test('AppError carries an HTTP status', () => {
    expect(new AppError(423, 'ACCOUNT_LOCKED', 'locked').status).toBe(423);
  });
});
