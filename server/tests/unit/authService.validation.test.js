const { validateRegistration } = require('../../src/services/authService');

const valid = { username: 'omkar_01', email: 'omkar@test.com', password: 'Chat1234' };
const fieldOf = (input) => {
  try {
    validateRegistration(input);
    return null;
  } catch (e) {
    return e.field;
  }
};

describe('REQ-AUTH-1 registration rules', () => {
  test('TC-AUTH-02 valid input passes', () => expect(fieldOf(valid)).toBeNull());
  test('TC-AUTH-02 (a) username "ab" is rejected', () => expect(fieldOf({ ...valid, username: 'ab' })).toBe('username'));
  test('username longer than 20 or with symbols is rejected', () => {
    expect(fieldOf({ ...valid, username: 'a'.repeat(21) })).toBe('username');
    expect(fieldOf({ ...valid, username: 'bad-name' })).toBe('username');
  });
  test('invalid email is rejected', () => expect(fieldOf({ ...valid, email: 'not-an-email' })).toBe('email'));
  test('TC-AUTH-02 (b) password without a digit is rejected', () =>
    expect(fieldOf({ ...valid, password: 'abcdefgh' })).toBe('password'));
  test('password shorter than 8 or without a letter is rejected', () => {
    expect(fieldOf({ ...valid, password: 'Ab1' })).toBe('password');
    expect(fieldOf({ ...valid, password: '12345678' })).toBe('password');
  });
  test('non-string values are rejected', () => expect(fieldOf({ ...valid, username: { $ne: '' } })).toBe('username'));
});
