const { escapeRegex } = require('../../src/services/userService');

describe('REQ-PRO-3 search input is treated as plain text', () => {
  test('regex special characters are escaped', () => {
    expect(escapeRegex('a.b*(c)')).toBe('a\\.b\\*\\(c\\)');
    expect(new RegExp(escapeRegex('a.b'), 'i').test('axb')).toBe(false);
  });
});
